import type { ApplicationFunctionOptions } from "probot";
import type {
  RepositoryMetadataSchemaType,
  RepositorySchemaType,
} from "@src/models/index.ts";
import type { Redis } from "ioredis";

export interface SchedulerAppOptions extends ApplicationFunctionOptions {
  skipFullSync?: boolean;
  redisClient: Redis;
  getRepositorySchedule: (
    repository: RepositorySchemaType,
    currentMetadata?: RepositoryMetadataSchemaType,
  ) => Promise<RepositoryMetadataSchemaType>;
}

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

export interface SchedulerJobData {
  installation_id: number;
  repository_id: number;
  full_name: string;
  metadata: RepositoryMetadataSchemaType | null;
}
