// src/routes/route.socketMap.ts (express)
import express from "express";
import { getSocketMap } from "../services/socketUserMap";

const socketMapRouter = express.Router();

// Protect this route using a key or secret
socketMapRouter.get("/socket-map", (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.SOCKET_API_SECRET_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const entries = Array.from(getSocketMap().entries());
  return res.status(200).json({ data: entries });
});

export default socketMapRouter;
