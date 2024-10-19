import "@std/dotenv/load";
import { Worker } from "bullmq";
import { QueueName } from "@/lib/queue/enums.ts";
import { redisClient } from "@/lib/queue/index.ts";
import { processTask } from "@/lib/processors/task.ts";

const worker = new Worker(QueueName.RepoJobQueue, processTask, {
  connection: redisClient,
  removeOnComplete: { count: 5 },
  removeOnFail: { count: 5 },
});

worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
