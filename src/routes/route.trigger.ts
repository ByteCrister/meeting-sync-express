// src/routes/trigger.ts in Express
import express from "express";
import { triggerSocketEvent } from "../socket/triggerSocketEvent";

const triggerRouter = express.Router();

triggerRouter.post("/trigger-event", async (req, res) => {
    const token = req.headers["x-api-key"];

    if (token !== process.env.SOCKET_API_SECRET_KEY) {
        return res.status(403).json({ message: "Forbidden" });
    }
    console.log(req.body);
    const { userId, type, notificationData, namespace } = req.body;

    if (!userId || !type) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        triggerSocketEvent({ userId, type, notificationData, namespace });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.log("Error triggering socket event:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default triggerRouter;
