import { repoJobQueue, JobPriority, RepoJobData } from "./index.ts";

function getJobSchedulerId(jobData: RepoJobData) {
  return `[job-scheduler_${jobData.installation_id}_${jobData.repository_id}]`;
}

function getJobId(jobData: RepoJobData) {
  return `[job_${jobData.installation_id}_${jobData.repository_id}]`;
}

export function scheduleJob(jobData: RepoJobData, options: {
  cron: string;
  jobPriority?: JobPriority;
}) {
  const {
    cron,
    jobPriority = JobPriority.Normal
  } = options;

  return repoJobQueue.upsertJobScheduler(
    getJobSchedulerId(jobData),
    {
      pattern: cron,
      // Immediately seem to have a bug and ignores pattern (cron) when set
      immediately: false,
    },
    {
      name: getJobId(jobData),
      data: jobData,
      opts: {
        priority: jobPriority,
      },
    },
  );
}

export function addJob(jobData: RepoJobData, jobPriority = JobPriority.High) {
  const jobId = getJobId(jobData);
  return repoJobQueue.add(
    jobId,
    jobData,
    {
      jobId,
      priority: jobPriority,
      deduplication: {
        id: jobId,
      },
    },
  );
}

export async function unscheduleJob(jobData: RepoJobData) {
  await repoJobQueue.removeJobScheduler(getJobSchedulerId(jobData))
  await repoJobQueue.remove(getJobId(jobData))
}
