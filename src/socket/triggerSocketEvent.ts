// G:\Projects\meeting-sync-express\src\socket\triggerSocketEvent.ts
import { getUserSocketId } from "../services/socketUserMap";
import { SocketTriggerTypes } from "../utils/constants";
import { getIOInstance } from "./setIOInstance"; // previous path in next.js

type Namespace = "chat" | "video";

interface TriggerSocketParams {
    userId: string;
    type: SocketTriggerTypes;
    notificationData: unknown;
    namespace?: Namespace;  // optional, default to "chat"
}

export const triggerSocketEvent = async ({
    userId,
    type,
    notificationData,
}: TriggerSocketParams) => {
    const io = getIOInstance();

    if (!io) {
        console.warn("Socket.IO instance not initialized");
        return;
    }

    const namespaceIo = io.of(`/chat`);  // get chat instance
    const socketId = getUserSocketId(userId);

    if (!socketId) {
        console.warn(` No active socketId found for userId: ${userId}`);
        return;
    }

    try {
        namespaceIo.to(socketId).emit(type, { userId, notificationData });
        console.log(`---------------- Socket event '${type}' sent to userId: ${userId} on namespace 'chat' ---------------`);
    } catch (err) {
        console.error("Error triggering socket event:", err);
    }
};