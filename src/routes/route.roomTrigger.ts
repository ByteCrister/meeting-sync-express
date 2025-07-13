// POST /api/trigger-room-event
import express from "express";
import { triggerRoomSocketEvent } from "../socket/triggerRoomSocketEvent";

const triggerVideoRouter = express.Router()
triggerVideoRouter.post("/trigger-room-event", async (req, res) => {
    const token = req.headers["x-api-key"];

    if (token !== process.env.SOCKET_API_SECRET_KEY) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const { roomId, type, data, namespace } = req.body;

    if (!roomId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        triggerRoomSocketEvent({ roomId, type, data, namespace });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error triggering room socket event:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default triggerVideoRouter;