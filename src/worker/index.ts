import "@std/dotenv/load";
import { Redis } from "ioredis";
import { Worker } from "bullmq";
import { appConfig } from "@src/config/app-config.ts";
import { QueueName } from "@src/utils/types.ts";
import logger from "@src/utils/logger.ts";
import repoJobProcessor from "./processor.ts";

const redisClient = new Redis(appConfig.redisConfig!, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  QueueName.RepoJobQueue,
  // `${import.meta.dirname}/processor.ts`,
  repoJobProcessor,
  {
    connection: redisClient,
    concurrency: 3,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  },
);

worker.on("completed", (job) => {
  logger.info(
    { queue: QueueName.RepoJobQueue, jobId: job.id },
    "✅ Job completed successfully",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    { queue: QueueName.RepoJobQueue, jobId: job?.id, error: err },
    "❌ Job failed",
  );
});
