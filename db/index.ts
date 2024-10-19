import mongoose from "mongoose";
import { appConfig } from "@/lib/helpers.ts";

export const connectMongoDB = async () => {
  await mongoose.connect(appConfig.mongoDBUrl!);
  if (mongoose.connection.readyState !== 1) {
    throw new Error("[MongoDB] Failed to connect");
  }
  console.log("[MongoDB] Connected");
};

export const disconnectMongoDB = async () => {
  await mongoose.disconnect();
  console.log("[MongoDB] Disconnected");
};
