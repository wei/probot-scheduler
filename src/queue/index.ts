import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { appConfig } from "@src/utils/index.ts";
import { QueueName } from "./enums.ts";

export const redisClient = new Redis(appConfig.redisConfig!, {
  maxRetriesPerRequest: null,
});

export const repoJobQueue = new Queue(
  QueueName.RepoJobQueue,
  {
    connection: redisClient,
  },
);

export * from "./enums.ts";
export * from "./scheduler.ts";
