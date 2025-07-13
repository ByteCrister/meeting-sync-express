// G:\Projects\meeting-sync-express\src\services\socketUserMap.ts (express)
export { };

declare global {
    // eslint-disable-next-line no-var
    var _userSocketMap: Map<string, string> | undefined;
}

type SocketMap = Map<string, string>;

export const getSocketMap = (): SocketMap => {
    if (!global._userSocketMap) {
        global._userSocketMap = new Map<string, string>();
    }
    return global._userSocketMap;
};

// In your socket user map logic (socketUserMap.ts)
export const registerUserSocket = (userId: string, socketId: string) => {
    const map = getSocketMap(); // Get the socket map from the global object
    map.set(userId, socketId);  // Add userId and socketId to the map
    // console.log(`User ${userId} registered with Socket ID: ${socketId}`);
    // console.log("Updated user socket map:", JSON.stringify(Array.from(map.entries()), null, 2));
};

export const removeUserSocket = (socketId: string): void => {
    const map = getSocketMap(); // Get the socket map
    for (const [userId, sId] of map.entries()) {
        if (sId === socketId) {
            map.delete(userId); // Remove user from map based on socketId
            break;
        }
    }
};

export const getUserSocketId = (userId: string): string | undefined => {
    const map = getSocketMap(); // Get the socket map
    // console.log("Checking map before returning socketId:", JSON.stringify(Array.from(map.entries()), null, 2));
    // console.log(`Looking for userId: ${userId}`);
    const socketId = map.get(userId);
    // console.log(`get user socket id for ${userId}: ${socketId}`);
    return socketId; // Return socketId associated with the userId
};



export const getUserIdBySocketId = (socketId: string): string | null => {
    const map = getSocketMap(); // Get the socket map
    for (const [userId, sId] of map.entries()) {
        if (sId === socketId) {
            return userId; // Return the userId associated with the socketId
        }
    }
    return null; // Return null if not found
};