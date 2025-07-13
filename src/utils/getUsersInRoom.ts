import VideoCallModel, { IVideoCall } from "../models/VideoCallModel";

/**
 * Returns an array of userIds in a given room (meeting).
 * @param roomId - The meetingId for the video call
 */
const getUsersInRoom = async (roomId: string): Promise<string[]> => {
  const call = (await VideoCallModel.findOne({ meetingId: roomId }).lean()) as IVideoCall | null;

  if (!call || !call.participants) return [];

  return call.participants.map((participant) => participant.userId.toString());
};

export default getUsersInRoom;
