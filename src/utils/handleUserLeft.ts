import { UpdateQuery } from "mongoose";
import VideoCallModel, { IVideoCall } from "../models/VideoCallModel";

export const handleUserLeft = async (userId: string, roomId: string) => {
    try {
        const call: IVideoCall | null = await VideoCallModel.findOne({
            meetingId: roomId,
            "participants.userId": userId,
        });

        if (!call) {
            console.log(`No matching video call found for user: ${userId} in room: ${roomId}`);
            return;
        }

        const isHost = userId.toString() === call.hostId.toString();
        const participantIndex = call.participants.findIndex(
            (p) => p.userId.toString() === userId.toString()
        );

        if (participantIndex === -1) {
            console.log(`Participant not found in participants array for user: ${userId}`);
            return;
        }
        const update: UpdateQuery<IVideoCall> = {
            $set: {
                [`participants.${participantIndex}.isActive`]: false,
            },
        };

        if (!isHost) {
            const participant = call.participants[participantIndex];
            const sessionIndex = participant.sessions
                .slice()
                .reverse()
                .findIndex((s) => !s.leftAt);

            if (sessionIndex !== -1) {
                const realIndex = participant.sessions.length - 1 - sessionIndex;
                update.$set[`participants.${participantIndex}.sessions.${realIndex}.leftAt`] = new Date();
            }
        }

        await VideoCallModel.updateOne({ _id: call._id }, update);

        console.log(
            `\n******Marked ${isHost ? "host" : "participant"} as inactive (userId: ${userId}) in room ${roomId}******\n`
        );
    } catch (err) {
        console.error("Error in handleUserLeft:", err);
    }
};
