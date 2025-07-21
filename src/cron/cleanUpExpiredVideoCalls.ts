import VideoCallModel, { IVideoCall } from "@/models/VideoCallModel";
import SlotModel from "@/models/SlotModel";
import UserModel from "@/models/UserModel";
import { DateTime } from "luxon";
import ConnectDB from "@/config/ConnectDB";
import { handleDeleteVideoCallDirectly } from "../server/handleDeleteVideoCallDirectly";
import { updateTrendScoreForSlot } from "../server/updateTrendScoreForSlot";
import { IVideoCallStatus } from "../constants";

export async function cleanupExpiredVideoCalls() {
    try {
        await ConnectDB();
    } catch (connErr) {
        console.log("[cleanupExpiredVideoCalls] DB connection failed:", connErr);
        return;
    }

    const nowUTC = DateTime.utc(); // Current time in UTC

    let videoCalls: IVideoCall[];
    try {
        videoCalls = await VideoCallModel.find({
            status: { $in: [IVideoCallStatus.ACTIVE, IVideoCallStatus.WAITING] }
        });
        if (videoCalls && videoCalls.length === 0) return;
    } catch (err) {
        console.log("[cleanupExpiredVideoCalls] Failed to fetch video calls:", err);
        return;
    }

    for (const call of videoCalls) {
        try {
            const slot = await SlotModel.findById(call.meetingId); // Get the slot related to the video call

            // If no related slot is found, treat it as orphaned and delete
            if (!slot) {
                console.log(`[cleanupExpiredVideoCalls] Slot not found for call ${call._id}. Deleting orphaned video call.`);
                await VideoCallModel.deleteOne({ _id: call._id });
                continue;
            }

            // Fetch user timezone in format "UTC+06:00" ➜ extract "+06:00"
            const user = await UserModel.findById(slot.ownerId).select("timeZone");
            const timeZone = user?.timeZone?.match(/[+-]\d{2}:\d{2}/)?.[0] || "+00:00";

            // Extract only the date from the slot's meetingDate
            const baseDate = DateTime.fromJSDate(slot.meetingDate).setZone(timeZone);

            /**
             * Converts 12-hour format string like "1:30 PM" to hours and minutes in 24-hour format.
             */
            const parse12HrTime = (timeStr: string) => {
                const [time, modifier] = timeStr.trim().split(" ");
                // eslint-disable-next-line prefer-const
                let [hours, minutes] = time.split(":").map(Number);
                if (modifier === "PM" && hours !== 12) hours += 12;
                if (modifier === "AM" && hours === 12) hours = 0;
                return { hours, minutes };
            };

            const from = parse12HrTime(slot.durationFrom); // Start time (local)
            const to = parse12HrTime(slot.durationTo);     // End time (local)

            // Construct full start DateTime in user's time zone, then convert to UTC
            const start = baseDate.set({
                hour: from.hours,
                minute: from.minutes,
                second: 0,
                millisecond: 0,
            }).toUTC();

            let end = baseDate.set({
                hour: to.hours,
                minute: to.minutes,
                second: 0,
                millisecond: 0,
            }).toUTC();


            // Handle overnight meetings (e.g. 11PM to 1AM next day)
            if (end <= start) {
                end = end.plus({ days: 1 });
            }

            // Add grace period to prevent premature deletion
            const gracePeriod = 180; // seconds (3 minutes)

            // Debug log
            console.table({
                slotId: slot._id.toString(),
                start: start.toISO(),
                end: end.toISO(),
                nowUTC: nowUTC.toISO(),
                graceEnd: end.plus({ seconds: gracePeriod }).toISO(),
            });

            // If the video call is already past the end time (plus grace), delete it
            if (end.plus({ seconds: gracePeriod }) <= nowUTC) {
                await handleDeleteVideoCallDirectly(slot._id.toString());
                await updateTrendScoreForSlot(slot._id.toString());
                console.log(`[cleanupExpiredVideoCalls] ✅ Deleted expired video call for slot ${slot._id}`);
            } else {
                console.log(`[cleanupExpiredVideoCalls] ⏳ Skipped active video call for slot ${slot._id}`);
            }

        } catch (err) {
            console.log(`[cleanupExpiredVideoCalls] ❌ Error processing call ${call._id}:`, err);
        }
    }
}