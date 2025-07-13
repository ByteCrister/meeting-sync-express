import express, { Request, Response } from "express";
import { getVideoSocketMap } from "../services/videoSocketUserMap";

const videoSocketMapRouter = express.Router();
videoSocketMapRouter.get("/video-socket-map", (req: Request, res: Response) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.SOCKET_API_SECRET_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const entries = Array.from(getVideoSocketMap().entries());
  return res.status(200).json({ success: true, data: entries });
});

export default videoSocketMapRouter;
