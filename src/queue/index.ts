import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { appConfig } from "@src/utils/config.ts";

export const QueueName = {
  RepoJobQueue: "RepoJobQueue",
} as const;

export type QueueName = typeof QueueName[keyof typeof QueueName];

export const JobPriority = {
  Low: 20,
  Normal: 10,
  High: 5,
} as const;

export type JobPriority = typeof JobPriority[keyof typeof JobPriority];

export interface RepoJobData {
  installation_id: number;
  repository_id: number;
  full_name: string;
  inserted_at: Date;
}

export const redisClient = new Redis(appConfig.redisConfig!, {
  maxRetriesPerRequest: null,
});

export const repoJobQueue = new Queue(
  QueueName.RepoJobQueue,
  {
    connection: redisClient,
  },
);

export * from "./scheduler.ts";
