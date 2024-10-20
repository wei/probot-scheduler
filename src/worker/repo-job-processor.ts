import type { Job } from "bullmq";
import type { RepoJobData } from "@src/queue/index.ts";
import logger from "@src/utils/logger.ts";

export default async function RepoJobProcessor(job: Job<RepoJobData>) {
  const log = logger.child({
    jobId: job.id,
    jobData: job.data,
  });

  log.info("🏃 Processing repo job");

  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });

  log.info(`✅ Repo job ${job.id} processed successfully`);
}
