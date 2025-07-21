import getNotificationExpiryDate from "./getNotificationExpiryDate";
import { parse } from 'date-fns';
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import UserModel from "../models/UserModel";
import SlotModel from "../models/SlotModel";
import VideoCallModel from "../models/VideoCallModel";
import { IVideoCallStatus, SocketTriggerTypes } from "../utils/constants";
import NotificationsModel, { INotificationType } from "../models/NotificationsModel";
import { triggerSocketEvent } from "../socket/triggerSocketEvent";


// Function to detect time format and parse
export const parseTime = (timeString: string, referenceDate: Date): Date => {
  // Try parsing time in 24-hour format first (e.g., "14:30")
  const time24 = parse(timeString, 'HH:mm', referenceDate);
  if (!isNaN(time24.getTime())) {
    return time24;
  }

  // If 24-hour format fails, try parsing in 12-hour format with AM/PM (e.g., "2:30 PM")
  const time12 = parse(timeString, 'hh:mm a', referenceDate);
  if (!isNaN(time12.getTime())) {
    return time12;
  }

  throw new Error('Invalid time format'); // Handle invalid time format
};

export async function handleCreateVideoCallDirectly(meetingId: string, userId: string) {
  await connectDB();
  console.log(`Creating Video Call for meeting ${meetingId} by user ${userId}`);

  const user = await UserModel.findById(userId).select("image");
  if (!user) throw new Error("User not found");

  const slot = await SlotModel.findById(meetingId);
  if (!slot) throw new Error("Slot not found");

  // Parse the time strings into Date objects based on meetingDate
  const meetingDate = new Date(slot.meetingDate);
  const startTime = parseTime(slot.durationFrom, meetingDate);
  const endTime = parseTime(slot.durationTo, meetingDate);

  // Handle cross-midnight meetings
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }


  const newCall = await VideoCallModel.create({
    meetingId,
    hostId: userId,
    participants: [
    ],
    status: IVideoCallStatus.WAITING, // ? The video is just created still host not joined
    startTime,
    endTime,
    chatMessages: [],
    settings: {
      allowChat: false,
      allowScreenShare: false,
      allowRecording: false,
    }
  });

  // Notifications boiler plate
  const sendNewNotification = {
    type: INotificationType.MEETING_STARTED,
    sender: userId.toString(),
    image: user.image,
    slot: meetingId,
    message: `Get ready! The meeting is about to start.`,
    isRead: false,
    isClicked: false,
    createdAt: new Date(),
    expiresAt: getNotificationExpiryDate(30),
  };

  await Promise.all(slot.bookedUsers.map(async (bookedUserId: mongoose.Types.ObjectId) => {
    const notificationDoc = new NotificationsModel({ ...sendNewNotification, receiver: bookedUserId });
    const savedNotification = await notificationDoc.save();

    await UserModel.findByIdAndUpdate(bookedUserId, { $inc: { countOfNotifications: 1 } });

    triggerSocketEvent({
      userId: String(bookedUserId),
      type: SocketTriggerTypes.MEETING_STARTED,
      notificationData: {
        // ? New notification body
        notification: {
          ...sendNewNotification,
          receiver: bookedUserId,
          _id: savedNotification._id
        },
        // ? Slot id to change the slot status to Ongoing for specific user's account
        slotId: meetingId,
      },
    });

  }));

  return newCall;
}