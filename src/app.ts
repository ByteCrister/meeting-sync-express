// src/server.ts
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";

import "dotenv/config";            // loads .env in dev
import { startCronJobs } from "./cron";
import { initializeSocket } from "./controllers/socketController";
import { setIOInstance } from "./socket/setIOInstance";

import triggerRouter from "./routes/route.trigger";
import triggerVideoRouter from "./routes/route.roomTrigger";
import socketMapRouter from "./routes/route.socketMap";
import videoSocketMapRouter from "./routes/route.videoSocketMap";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import logger from "./config/logger";

async function bootstrap() {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start cron jobs only after DB is ready
  startCronJobs();

  // 3. Initialize Express + HTTP server
  const app = express();
  const server = http.createServer(app);

  // 4. Global Middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(helmet());

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-cron-secret"],
      credentials: true,
    })
  );

  // 5. Socket.io Setup
  const io = new SocketIOServer(server, {
    path: env.SOCKET_PATH,
    pingInterval: 10000,
    pingTimeout: 20000,
    cors: {
      origin: env.CLIENT_ORIGIN,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-cron-secret"],
      credentials: true,
    },
  });

  setIOInstance(io);
  initializeSocket(io);

  // 6. Routes
  app.get("/", (_req, res) => {
    res.send("Meeting Sync Express server running.");
  });

  app.use("/api", triggerRouter);
  app.use("/api", triggerVideoRouter);
  app.use("/api", socketMapRouter);
  app.use("/api", videoSocketMapRouter);

  // 7. Health Check
  app.get("/health", (_req, res) => {
    const state = process.env.NODE_ENV === "production"
      ? io.engine.clientsCount > 0
        ? "ok"
        : "idle"
      : "dev";
    res.json({ status: state });
  });

  // 8. Start Listening
  server.listen(env.PORT, () => {
    logger.info(`Server ▶ Listening on port ${env.PORT}`);
  });

  // 9. Graceful Shutdown
  const shutdown = async () => {
    logger.info("Server ▶ Shutdown initiated");
    await disconnectDB();
    server.close(() => {
      logger.info("Server ▶ HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  logger.error("Server ▶ Failed to bootstrap:", err);
  process.exit(1);
});