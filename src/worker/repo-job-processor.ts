import type { Job } from "bullmq";
import type { RepoJobData } from "@src/queue/index.ts";
import logger from "@src/utils/logger.ts";

export default async function RepoJobProcessor(job: Job<RepoJobData>) {
  await new Promise((resolve) => {
    logger.info({ jobId: job.id, jobData: job.data }, "Processing repo job");
    setTimeout(resolve, 3000);
  });
}
