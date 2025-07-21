import mongoose from "mongoose";
import logger from "./logger";
import { env } from "./env";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected || mongoose.connection.readyState === 1) {
    logger.info("DB ▶ Already connected");
    return;
  }

  let attempt = 0;
  while (attempt < env.DB_CONN_RETRIES) {
    try {
      mongoose.set("strictQuery", true);
      await mongoose.connect(env.MONGODB_URI, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      logger.info("DB ▶ MongoDB connection established");
      break;
    } catch (error) {
      attempt++;
      const msg = (error as Error).message;
      logger.error(`DB ✖︎ Connection attempt ${attempt} failed: ${msg}`);
      if (attempt >= env.DB_CONN_RETRIES) {
        logger.error(`DB ✋ Exhausted ${env.DB_CONN_RETRIES} retries — exiting`);
        process.exit(1);
      }
      const backoff = env.DB_CONN_RETRY_DELAY_MS * 2 ** (attempt - 1);
      logger.info(`DB ⏳ Retrying in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

// Mongoose event listeners
mongoose.connection.on("connected",   () => logger.info("DB event ▶ connected"));
mongoose.connection.on("error",       (err) => logger.error("DB event ▶ error", err));
mongoose.connection.on("disconnected",() => logger.warn("DB event ▶ disconnected"));

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    logger.info("DB ▶ Closing MongoDB connection");
    await mongoose.connection.close();
  }
}
