import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/db";
import { initializeSocket } from "./controllers/socketController";
import triggerRouter from "./routes/route.trigger";
import triggerVideoRouter from "./routes/route.roomTrigger";
import cors from "cors";
import helmet from "helmet";
import { setIOInstance } from "./socket/setIOInstance";
import videoSocketMapRouter from "./routes/route.videoSocketMap";
import socketMapRouter from "./routes/route.socketMap";
import { startCronJobs } from "./cron";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*", // or use a specific domain in production
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-cron-secret"],
    credentials: true,
  })
);

const io = new SocketIOServer(server, {
  path: process.env.SOCKET_PATH || "/socket.io",
  pingInterval: 10000,
  pingTimeout: 20000,
  cors: {
    origin: process.env.CLIENT_ORIGIN || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-cron-secret"],
    credentials: true,
  },
});
startCronJobs();
setIOInstance(io);
initializeSocket(io);

app.get("/", (req, res) => {
  res.send("Meeting Sync Express server running.");
});

app.use("/api", triggerRouter);
app.use("/api", triggerVideoRouter);
app.use("/api", socketMapRouter);
app.use("/api", videoSocketMapRouter);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on  http://localhost:${PORT}`);
  });
});