import { Worker } from "bullmq";
import type { Processor, WorkerOptions } from "bullmq";
import { QueueName, type SchedulerJobData } from "@src/utils/types.ts";

export function createRepoJobWorker(
  processor: string | URL | Processor<SchedulerJobData, void, string>,
  options: WorkerOptions,
): Worker<SchedulerJobData, void, string> {
  const worker = new Worker(
    QueueName.RepoJobQueue,
    processor,
    options,
  );

  return worker;
}
