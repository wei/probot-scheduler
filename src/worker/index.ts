import { QueueName } from "@src/utils/types.ts";
import logger from "@src/utils/logger.ts";
import { getRedisClient } from "@src/configs/redis.ts";
import { createRepoJobWorker } from "@src/worker/create-worker.ts";
import repoJobProcessor from "./processor.ts";

const redisClient = getRedisClient();

const worker = createRepoJobWorker(
  repoJobProcessor, // `${import.meta.dirname}/processor.ts`,
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

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);
  await worker.close();
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", () => gracefulShutdown("SIGINT"));
Deno.addSignalListener("SIGTERM", () => gracefulShutdown("SIGTERM"));
