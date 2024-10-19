import type { Job } from "bullmq";
import type { RepoJobData } from "@/lib/queue/index.ts";

export async function processTask(job: Job<RepoJobData>) {
  await new Promise((resolve) => {
    console.log('Processing task:', new Date(), job.id, job.data);
    setTimeout(resolve, 3000)
  });
}
