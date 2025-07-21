import mongoose from "mongoose";
import { IVideoCall } from "../models/VideoCallModel";

export async function calculateAndUpdateEngagement(call: IVideoCall) {
  console.log(`\n\nEntered calculateAndUpdateEngagement...${call.endTime} - ${call.startTime}`);
  if (!call.endTime || !call.startTime) return;

  const totalCallTime = call.endTime.getTime() - call.startTime.getTime();
  console.log(`totalCallTime: ${totalCallTime}`);
  if (totalCallTime <= 0) return;

  let totalEngagement = 0;
  let countedParticipants = 0;
  const filteredParticipants = call.participants.filter((p) => p.userId.toString() !== call.hostId.toString());

  console.log(`filteredParticipants: ${filteredParticipants}`);
  for (const p of filteredParticipants) {
    if (!Array.isArray(p.sessions) || p.sessions.length === 0) continue;

    let totalParticipantTime = 0;
    for (const session of p.sessions) {
      if (!session.joinedAt) continue;
      const joinedAt = new Date(session.joinedAt);
      if (isNaN(joinedAt.getTime())) continue;

      const rawLeftAt = session.leftAt ? new Date(session.leftAt) : call.endTime;
      const leftAt = !isNaN(rawLeftAt.getTime()) ? rawLeftAt : call.endTime;

      const sessionStart = joinedAt < call.startTime ? call.startTime : joinedAt;
      const sessionEnd = leftAt > call.endTime ? call.endTime : leftAt;

      const sessionTime = Math.max(0, sessionEnd.getTime() - sessionStart.getTime());
      totalParticipantTime += sessionTime;
    }

    console.log(`totalParticipantTime: ${totalParticipantTime}`);
    if (totalParticipantTime > 0) {
      const ratio = totalParticipantTime / totalCallTime;
      totalEngagement += Math.min(1, ratio);
      countedParticipants++;
    }
  }

  const averageEngagementRate =
    countedParticipants > 0 ? (totalEngagement / countedParticipants) : 0;
  console.log(`***averageEngagementRate of ${call.meetingId} Slot***`);
  console.log(`***New averageEngagementRate: ${averageEngagementRate}***`);

  await mongoose.model("slots").findByIdAndUpdate(call.meetingId, {
    engagementRate: Math.round(averageEngagementRate * 100),
  });

  return true;
}