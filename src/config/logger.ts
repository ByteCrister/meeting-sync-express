// src/config/logger.ts
import pino from "pino";
import { env } from "./env";

const logger = pino({
  level: env.LOG_LEVEL || "info",
  transport: {
    target: require.resolve("pino-pretty"),
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      singleLine: true,
    },
  },
});

export default logger;
