import type { Job } from "bullmq";
import logger from "@src/utils/logger.ts";
import type { SchedulerJobData } from "@src/utils/types.ts";

export default async function RepoJobProcessor(job: Job<SchedulerJobData>) {
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
