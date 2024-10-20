import "@std/dotenv/load";
import { Worker } from "bullmq";
import { QueueName } from "@src/queue/index.ts";
import { redisClient } from "@src/queue/index.ts";
import logger from "@src/utils/logger.ts";
import repoJobProcessor from "./repo-job-processor.ts";

const worker = new Worker(
  QueueName.RepoJobQueue,
  // `${import.meta.dirname}/repo-job-worker.ts`,
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
    "Job has completed",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    { queue: QueueName.RepoJobQueue, jobId: job?.id, error: err },
    "Job has failed",
  );
});
