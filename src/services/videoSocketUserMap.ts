export { };

declare global {
  // eslint-disable-next-line no-var
  var _videoUserSocketMap: Map<string, string> | undefined;
}

type VideoSocketMap = Map<string, string>;

export const getVideoSocketMap = (): VideoSocketMap => {
  if (!global._videoUserSocketMap) {
    global._videoUserSocketMap = new Map<string, string>();
  }
  return global._videoUserSocketMap;
};

// Register a user's socket for video
export const registerVideoUserSocket = (userId: string, socketId: string): void => {
  const map = getVideoSocketMap();
  map.set(userId, socketId);
  // console.log(`[VIDEO] Registered user ${userId} with socket ${socketId}`);
};

// Remove a user socket entry by socketId
export const removeVideoUserSocket = (socketId: string): void => {
  const map = getVideoSocketMap();
  for (const [userId, sId] of map.entries()) {
    if (sId === socketId) {
      map.delete(userId);
      // console.log(`[VIDEO] Removed user ${userId} for socket ${socketId}`);
      break;
    }
  }
};

// Get socketId from userId
export const getVideoUserSocketId = (userId: string): string | undefined => {
  const map = getVideoSocketMap();
  return map.get(userId);
};

// Get userId from socketId
export const getVideoUserIdBySocketId = (socketId: string): string | null => {
  const map = getVideoSocketMap();
  for (const [userId, sId] of map.entries()) {
    if (sId === socketId) {
      return userId;
    }
  }
  return null;
};