import "@std/dotenv/load";
import { Worker } from "bullmq";
import { QueueName } from "@/lib/queue/enums.ts";
import { redisClient } from "@/lib/queue/index.ts";
import repoJobWorker from "@/lib/worker/repo-job-worker.ts";

const worker = new Worker(
  QueueName.RepoJobQueue,
  // `${import.meta.dirname}/repo-job-worker.ts`,
  repoJobWorker,
  {
    connection: redisClient,
    concurrency: 3,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  },
);

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`${job?.id} has failed with ${err.message}`, err);
});
