import mongoose from "mongoose";
import log from "@src/utils/logger.ts";
import { appConfig } from "@src/utils/config.ts";

export const connectMongoDB = async () => {
  await mongoose.connect(appConfig.mongoDBUrl!);
  if (mongoose.connection.readyState !== 1) {
    throw new Error("[MongoDB] Failed to connect");
  }
  log.info("[MongoDB] Connected");
};

export const disconnectMongoDB = async () => {
  await mongoose.disconnect();
  log.info("[MongoDB] Disconnected");
};

export * from "./models/Installation.ts";
export * from "./models/Repository.ts";
