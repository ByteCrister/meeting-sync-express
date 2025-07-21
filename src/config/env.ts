// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string()
    .url()
    .describe("MongoDB connection string"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000)
    .describe("HTTP server port"),

  DB_CONN_RETRIES: z.coerce
    .number()
    .int()
    .positive()
    .default(5)
    .describe("How many times to retry DB connection"),

  DB_CONN_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(2000)
    .describe("Initial backoff in ms for DB retries"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"])
    .default("info")
    .describe("Pino log level"),

  SOCKET_SERVER_URL: z.string()
    .url()
    .describe("URL clients use to reach the Socket server"),

  SOCKET_PATH: z.string()
    .default("/socket.io")
    .describe("Socket.io path mount point"),

  CLIENT_ORIGIN: z.string()
    .url()
    .describe("Allowed CORS origin for your frontend"),

  SOCKET_API_SECRET_KEY: z.string()
    .min(1)
    .describe("Shared secret for Socket API auth"),

  EMAIL_AUTH: z.string()
    .email()
    .describe("Service account email for outgoing mail"),

  PASSWORD_AUTH: z.string()
    .min(8)
    .describe("Password or app-specific password for email account"),
});

// throws on missing/invalid vars
export const env = envSchema.parse(process.env);