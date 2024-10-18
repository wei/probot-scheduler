import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { QueueNames } from "./enums.ts";

export const redisClient = new Redis(Deno.env.get("REDIS_URL")!);

export const jobQueue = new Queue(
  QueueNames.JobQueue,
  {
    connection: redisClient,
  }
);

export * from "./enums.ts";
export * from "./scheduler.ts";
