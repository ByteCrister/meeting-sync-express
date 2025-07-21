import mongoose from "mongoose";
import { triggerRoomSocketEvent } from "../socket/triggerRoomSocketEvent";
import { connectDB } from "../config/db";
import VideoCallModel, { IVideoCallParticipant, IVideoCallSession } from "../models/VideoCallModel";
import { calculateAndUpdateEngagement } from "./calculateAndUpdateEngagement";
import { SocketTriggerTypes } from "../utils/constants";

export async function handleDeleteVideoCallDirectly(meetingId: string) {

  console.log(`[handleDeleteVideoCallDirectly] Attempting to delete video call for meetingId: ${meetingId}`);

  if (!mongoose.Types.ObjectId.isValid(meetingId)) {
    throw new Error("Invalid meetingId");
  }

  await connectDB();

  const videoCallDoc = await VideoCallModel.findOne({ meetingId: new mongoose.Types.ObjectId(meetingId) });
  if (!videoCallDoc) {
    console.log(`Can't find any videoDoc for meeting id: ${meetingId}`);
    return;
  };

  // Filter out host participants in memory if you want
  videoCallDoc.participants = videoCallDoc.participants.filter(
    (p: IVideoCallParticipant) => p.userId.toString() !== videoCallDoc.hostId.toString()
  );

  // Update open sessions
  videoCallDoc.participants.forEach((participant: IVideoCallParticipant) => {
    participant.sessions.forEach((session: IVideoCallSession) => {
      if (!session.leftAt) {
        session.leftAt = videoCallDoc.endTime || new Date();
      }
    });
  });

  await videoCallDoc.save();

  // Recalculate engagement before deleting
  await calculateAndUpdateEngagement(videoCallDoc);

  // Now delete the call
  await VideoCallModel.deleteOne({ meetingId });

  triggerRoomSocketEvent({ roomId: meetingId, type: SocketTriggerTypes.MEETING_ENDED, data: null });
}