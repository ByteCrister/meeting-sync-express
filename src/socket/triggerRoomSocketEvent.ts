import { SocketTriggerTypes } from "../utils/constants";
import { getIOInstance } from "./setIOInstance";

interface TriggerRoomSocketParams {
    roomId: string;
    type: SocketTriggerTypes;
    data: unknown;
    namespace?: "chat" | "video";
}

export const triggerRoomSocketEvent = ({
    roomId,
    type,
    data,
    namespace,
}: TriggerRoomSocketParams) => {
    const io = getIOInstance();
    if (!io) {
        console.log("Socket.IO instance not initialized");
        return;
    }

    const namespaceIO = io.of(`/${namespace}`);

    try {
        namespaceIO.to(roomId).emit(type, data);
        // console.log(`Socket event '${type}' sent to room: ${roomId} in namespace '${namespace}'`);
    } catch (err) {
        console.log("Error triggering room socket event:", err);
    }
};