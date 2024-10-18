import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { QueueName } from "./enums.ts";

export const redisClient = new Redis(Deno.env.get("REDIS_URL")!, {
  maxRetriesPerRequest: null,
});

export const jobQueue = new Queue(
  QueueName.RepoJobQueue,
  {
    connection: redisClient,
  }
);

export * from "./enums.ts";
export * from "./scheduler.ts";
