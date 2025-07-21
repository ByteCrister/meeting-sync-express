
import cron from "node-cron";
import { triggerSocketEvent } from "../socket/triggerSocketEvent";
import { DateTime } from "luxon";
import { getReminderHTML } from "./getReminderHTML";
import { connectDB } from "../config/db";
import SlotModel, { IRegisterStatus } from "../models/SlotModel";
import UserModel from "../models/UserModel";
import { emailAuthentication } from "../config/NodeEmailer";
import VideoCallModel, { IVideoCall } from "../models/VideoCallModel";
import { handleCreateVideoCallDirectly } from "../services/handleCreateVideoCallDirectly";
import NotificationsModel, { INotificationType } from "../models/NotificationsModel";
import getNotificationExpiryDate from "../services/getNotificationExpiryDate";
import { SocketTriggerTypes } from "../utils/constants";
import { handleDeleteVideoCallDirectly } from "../services/handleDeleteVideoCallDirectly";
import { cleanupExpiredVideoCalls } from "./cleanUpExpiredVideoCalls";
import { updateTrendScoreForSlot } from "../services/updateTrendScoreForSlot";

declare global {
    // Extend the globalThis interface to include slotStatusCronStarted
    // eslint-disable-next-line no-var
    var slotStatusCronStarted: boolean | undefined;
}
globalThis.slotStatusCronStarted = globalThis.slotStatusCronStarted || false;

// -----------------------------------------------------------------------------
// Helper utilities
// -----------------------------------------------------------------------------

/**
 * Convert a 12‑hour time string like "1:30 PM" to 24‑hour hours/minutes.
 */
export function parseTimeTo24Hour(timeStr: string): { hours: number; minutes: number } | null {
    try {
        if (!timeStr) throw new Error("Invalid time string");
        const [time, modifier] = timeStr.trim().split(" ");
        // eslint-disable-next-line prefer-const
        let [h, m] = time.split(":").map(Number);
        if (modifier === "PM" && h !== 12) h += 12;
        if (modifier === "AM" && h === 12) h = 0;
        if (isNaN(h) || isNaN(m)) throw new Error("Invalid time format");
        return { hours: h, minutes: m };
    } catch (error) {
        console.error("[parseTimeTo24Hour Error]:", (error as Error).message);
        return null;
    }
}

/**
 * Convert stored offset format (e.g. "UTC+06:00") to a Luxon‑compatible fixed‑offset string ("+06:00").
 */
function toLuxonZone(offset: string | undefined): string {
    if (!offset || !/UTC[+-]\d{2}:\d{2}/.test(offset)) return "+00:00";
    const raw = offset.replace("UTC", ""); // "+06:00" | "-05:30"
    return raw.startsWith("+") || raw.startsWith("-") ? raw : "+" + raw;
}

// -----------------------------------------------------------------------------
// Slot status updater (invoked by cron / scheduled job)
// -----------------------------------------------------------------------------

export async function updateSlotStatuses(): Promise<void> {
    try {
        console.log("START updateSlotStatuses:", new Date().toISOString());

        await connectDB();
        const nowUTC = DateTime.utc();

        const slots = await SlotModel.find({
            status: { $in: [IRegisterStatus.Upcoming, IRegisterStatus.Ongoing] },
        });

        if (!slots.length) {
            console.log("No slots found for status update.\n");
            return;
        }

        for (const slot of slots) {
            // ---------------------------------------------------------------------
            // 1️⃣  Sanity checks
            // ---------------------------------------------------------------------
            if (!slot.meetingDate || !slot.durationFrom || !slot.durationTo) {
                console.log(`Slot ID ${slot._id} missing time data.`);
                continue;
            }

            const user = await UserModel.findById(slot.ownerId).select("timeZone image email username");
            const luxonZone = toLuxonZone(user?.timeZone);

            const fromTime = parseTimeTo24Hour(slot.durationFrom);
            const toTime = parseTimeTo24Hour(slot.durationTo);
            if (!fromTime || !toTime) {
                console.log(`Slot ${slot._id}: Failed to parse from/to time.`);
                continue;
            }

            const meetingDateInUserZone = DateTime.fromJSDate(slot.meetingDate).setZone(luxonZone);

            // ---------------------------------------------------------------------
            // 2️⃣  Calculate start & end in UTC using fixed offset zone
            // ---------------------------------------------------------------------
            const start = meetingDateInUserZone.set({
                hour: fromTime.hours,
                minute: fromTime.minutes,
                second: 0,
                millisecond: 0
            }).toUTC();

            // Build end time in user zone
            let end = meetingDateInUserZone.set({
                hour: toTime.hours,
                minute: toTime.minutes,
                second: 0,
                millisecond: 0
            }).toUTC();

            if (end <= start) {
                console.log(`⚠️ Slot ${slot._id} has end <= start. Adding default 1.`);
                end = end.plus({ day: 1 }); // overnight meetings ➜ add 24h
            }

            // ---------------------------------------------------------------------
            // 3️⃣  Reminder email logic (1‑day, 3‑hour, 5‑min heads‑ups)
            // ---------------------------------------------------------------------
            const diffToStartMin = Math.floor(start.diff(nowUTC, "minutes").minutes);
            const diffToStartHours = Math.floor(diffToStartMin / 60);
            const diffToStartDays = Math.floor(diffToStartHours / 24);

            if (slot.status === IRegisterStatus.Upcoming && diffToStartDays <= 1) {
                const shouldSend =
                    (diffToStartDays === 1 && diffToStartHours % 24 === 0 && diffToStartMin % 60 === 0) ||
                    (diffToStartDays === 0 && diffToStartHours === 3 && diffToStartMin % 60 === 0) ||
                    (diffToStartDays === 0 && diffToStartHours === 0 && diffToStartMin === 5);

                if (shouldSend) {
                    const lastSent = slot.lastReminderSentAt ? DateTime.fromJSDate(slot.lastReminderSentAt) : null;
                    const secondsSinceLast = lastSent ? nowUTC.diff(lastSent, "seconds").seconds : Infinity;

                    if (secondsSinceLast > 60) {
                        const readableDate = meetingDateInUserZone.toFormat("yyyy-MM-dd"); // Or "dd LLL yyyy" or whatever format you like
                        const subject = `🔔 Reminder: Your meeting "${slot.title}" is coming up!`;
                        const html = getReminderHTML(user?.username || "", slot.title, readableDate!, slot.durationFrom);
                        if (user?.email) {
                            await emailAuthentication(user.email, subject, html);
                            slot.lastReminderSentAt = new Date();
                            await slot.save();
                            console.log(`Reminder sent to ${user.email} for slot ${slot._id}`);
                        }
                    }
                }
            }

            // ---------------------------------------------------------------------
            // 4️⃣  Determine new status (with 1‑min grace after end)
            // ---------------------------------------------------------------------
            let newStatus = slot.status;
            if (nowUTC < start) {
                newStatus = IRegisterStatus.Upcoming;
            } else if (nowUTC >= start && nowUTC <= end) {
                newStatus = IRegisterStatus.Ongoing;
            } else if (nowUTC > end) {
                const targetCall: IVideoCall | null = await VideoCallModel.findOne({ meetingId: slot._id })
                newStatus = targetCall && targetCall.participants.length > 1 ? IRegisterStatus.Completed : IRegisterStatus.Expired;
            }

            // ---------------------------------------------------------------------
            // 5️⃣  Persist status changes + side‑effects
            // ---------------------------------------------------------------------
            if (slot.status !== newStatus) {
                console.log(`Duration from: ${slot.durationFrom}  -  Duration to: ${slot.durationTo}\n`);
                console.log(`Slot ID: ${slot._id}   time now: ${nowUTC}  -   time start: ${start} previous status: ${slot.status}   new status: ${newStatus}\n`);

                if (newStatus === IRegisterStatus.Ongoing) {
                    const existingCall = await VideoCallModel.findOne({ meetingId: slot._id });

                    if (!existingCall) {
                        try {
                            const call = await handleCreateVideoCallDirectly(slot._id, slot.ownerId.toString());
                            console.log(`[updateSlotStatuses] Created video call: ${call._id}`);
                        } catch (err) {
                            console.error("Failed to create video call:", (err as Error).message);
                        }
                    }

                    const notification = {
                        type: INotificationType.MEETING_TIME_STARTED,
                        sender: slot.ownerId,
                        receiver: slot.ownerId,
                        slot: slot._id,
                        message: "*** It's time to start your meeting ***",
                        isRead: false,
                        isClicked: false,
                        createdAt: new Date(),
                        expiresAt: getNotificationExpiryDate(30),
                    } as const;

                    const saved = await new NotificationsModel(notification).save();
                    triggerSocketEvent({
                        userId: slot.ownerId.toString(),
                        type: SocketTriggerTypes.MEETING_TIME_STARTED,
                        notificationData: { ...notification, _id: saved._id, image: user?.image },
                    });
                }

                if ([IRegisterStatus.Expired, IRegisterStatus.Completed].includes(newStatus)) {
                    const existingCall = await VideoCallModel.findOne({ meetingId: slot._id });

                    console.log(existingCall);
                    if (existingCall) {
                        console.log(`[updateSlotStatuses] Deleting video call for slot ${slot._id}`);
                        await handleDeleteVideoCallDirectly(slot._id);
                    } else {
                        console.log(`[updateSlotStatuses] Skipped deletion — no video call found for slot ${slot._id}`);
                    }
                }

                // ⬅️ move it here (applies to ALL status changes)
                slot.status = newStatus;
                await slot.save();
                console.log(`Slot ${slot._id} updated to ${newStatus}`);

                // Trend update
                await updateTrendScoreForSlot(slot._id.toString());
            }


        }
        console.log(`END updateSlotStatuses: ${new Date().toISOString()}\n`);
    } catch (error) {
        console.error("[updateSlotStatuses Error]:", (error as Error).message);
    }
}


// Run this every minute
let isRunning = false;

let isCleanupRunning = false;
let cleanupCronStarted = false;

async function startSlotUpdateCorn() {
    if (globalThis.slotStatusCronStarted) {
        console.log("Cron job already started. Skipping initialization.");
        return;
    }

    cron.schedule("* * * * *", async () => {
        if (isRunning) return;
        isRunning = true;
        console.log("\nCron job running for slot status update");
        try {
            await updateSlotStatuses();
        } catch (e) {
            console.error(e);
        } finally {
            isRunning = false;
        }
    });

    globalThis.slotStatusCronStarted = true;
}


async function startVideoCallCleanupCron() {
    if (cleanupCronStarted) {
        console.log("\nVideo call cleanup cron already started. Skipping.");
        return;
    }

    cron.schedule("*/2 * * * *", async () => {
        if (isCleanupRunning) {
            console.log("\n[Cron Skipped] Previous cleanup still running.");
            return;
        }

        isCleanupRunning = true;
        const startTime = new Date();

        console.log(
            `[${startTime.toISOString()}] Starting expired video call cleanup...`
        );

        try {
            await cleanupExpiredVideoCalls();
            console.log(`[${new Date().toISOString()}] Cleanup finished.`);
        } catch (e) {
            console.error(
                `[Error - cleanupExpiredVideoCalls]:`,
                (e as Error).message
            );
        } finally {
            isCleanupRunning = false;
        }
    });

    cleanupCronStarted = true;
    console.log("Video call cleanup cron scheduled every 2 minutes.\n");
}


export const startCronJobs = async () => {
    await startSlotUpdateCorn();
    await startVideoCallCleanupCron();
}
