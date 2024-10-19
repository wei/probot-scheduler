import type { Job } from "bullmq";
import type { RepoJobData } from "@src/queue/index.ts";

export default async function RepoJobProcessor(job: Job<RepoJobData>) {
  await new Promise((resolve) => {
    console.log("Processing repo job:", new Date(), job.id, job.data);
    setTimeout(resolve, 3000);
  });
}
