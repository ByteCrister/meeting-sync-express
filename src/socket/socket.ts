// G:\Projects\meeting-sync-express\src\socket\socket.ts
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { initializeSocket } from "../controllers/socketController";
import { setIOInstance } from "./setIOInstance";

export let io: SocketIOServer;

export const initializeSocketServer = (server: http.Server) => {
  io = new SocketIOServer(server, {
    path: process.env.SOCKET_PATH || "/socket.io",
    pingInterval: 10000,
    pingTimeout: 20000,
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  setIOInstance(io); // Makes it available to triggerSocketEvent
  console.log("✅ Socket.IO initialized");

  initializeSocket(io); // handler with namespaces
};