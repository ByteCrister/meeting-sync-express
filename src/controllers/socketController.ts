import { Server, Socket } from "socket.io";
import {
    SocketTriggerTypes,
    VMSocketTriggerTypes,
} from "../utils/constants";
import {
    registerUserSocket,
    removeUserSocket,
} from "../services/socketUserMap";
import {
    registerVideoUserSocket,
    removeVideoUserSocket,
    getVideoUserSocketId,
    getVideoUserIdBySocketId,
} from "../services/videoSocketUserMap";
import getUsersInRoom from "../utils/getUsersInRoom";
import { handleUserLeft } from "../utils/handleUserLeft";
let initialized = false;

export function initializeSocket(io: Server) {
    if (initialized) return;
    initialized = true;
    // CHAT Namespace
    const chatNamespace = io.of("/chat");

    chatNamespace.on("connection", (socket: Socket) => {
        console.log("[CHAT/NOTIFICATION] Socket connected:", socket.id);

        socket.on(SocketTriggerTypes.REGISTER_USER, (data: { userId: string }) => {
            console.log(`[CHAT] User registered: ${data.userId}`);
            registerUserSocket(data.userId, socket.id);
            socket.data.userId = data.userId;
        });

        socket.on("disconnect", (reason) => {
            console.log(`[CHAT] Socket disconnected: ${socket.id}`);
            console.log("Socket disconnected:", socket.id, "Reason:", reason);
            removeUserSocket(socket.data.userId);
        });
    });

    // VIDEO Namespace
    const videoNamespace = io.of("/video");

    videoNamespace.on("connection", (socket: Socket) => {
        console.log("[VIDEO] Socket connected:", socket.id);

        socket.on(SocketTriggerTypes.LEAVE_ROOM, async ({ roomId, userId }) => {
            console.log(`[VIDEO] User ${userId} left room ${roomId}`);
            socket.leave(roomId);
            socket.to(roomId).emit(SocketTriggerTypes.USER_LEAVED, { userId });
        });

        // ? Joining a user to socket using meetingId/roomId
        socket.on(VMSocketTriggerTypes.JOIN_ROOM, async ({ roomId, userId }) => {
            socket.join(roomId);
            registerVideoUserSocket(userId, socket.id);
            socket.data.userId = userId;
            socket.data.roomId = roomId;

            // Get users in room
            // We can access sockets in room like this:
            const usersInRoom = await getUsersInRoom(roomId);
            const otherUserIds = usersInRoom.filter((id) => id !== userId);

            // Send existing users to the newly joined user
            socket.emit(VMSocketTriggerTypes.EXISTING_USERS, {
                existingUsers: otherUserIds,
            });

            // Notify other users that a new user joined
            socket.to(roomId).emit(VMSocketTriggerTypes.USER_JOINED, {
                newUserId: userId,
            });

            console.log(`[VIDEO] User ${userId} joined room ${roomId}`);
        });

        socket.on(VMSocketTriggerTypes.OFFER, ({ roomId, fromUserId, targetUserId, offer }) => {
            const targetSocketId = getVideoUserSocketId(targetUserId);
            if (targetSocketId) {
                socket.to(targetSocketId).emit(VMSocketTriggerTypes.RECEIVE_OFFER, {
                    fromUserId, // <- current user is sending offer
                    offer,
                });
            }
        });

        socket.on(VMSocketTriggerTypes.ANSWER, ({ roomId, fromUserId, targetUserId, answer }) => {
            const targetSocketId = getVideoUserSocketId(targetUserId);
            if (targetSocketId) {
                socket.to(targetSocketId).emit(VMSocketTriggerTypes.RECEIVE_ANSWER, {
                    fromUserId: socket.data.userId,
                    answer,
                });
            }
        });

        socket.on(VMSocketTriggerTypes.ICE_CANDIDATE, ({ roomId, targetUserId, candidate }) => {
            const targetSocketId = getVideoUserSocketId(targetUserId);
            if (targetSocketId) {
                socket.to(targetSocketId).emit(VMSocketTriggerTypes.RECEIVE_ICE_CANDIDATE, {
                    fromUserId: socket.data.userId,
                    candidate,
                });
            }
        });

        socket.on("disconnect", async () => {
            console.log("[VIDEO] Socket disconnected:", socket.id);
            const userId = getVideoUserIdBySocketId(socket.id);
            removeVideoUserSocket(socket.id);

            if (userId) {
                console.log(`[VIDEO] User ${userId} disconnected. Room: ${socket.data.roomId}`);
                await handleUserLeft(userId, socket.data.roomId);
            }

            if (userId && socket.data.roomId) {
                // * emit to user own room and clean up
                socket.to(socket.data.roomId).emit(VMSocketTriggerTypes.USER_LEAVED, { userId });
                // * emit to all other users in the room to remove that user from their UI and redux
                socket.to(socket.data.roomId).emit(SocketTriggerTypes.USER_LEAVED, { userId });
            }
        });
    });
}
