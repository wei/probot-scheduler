import { jobQueue, JobPriority, RepoJobData } from "./index.ts";

function getJobSchedulerId(jobData: RepoJobData) {
  return `[job-scheduler::${jobData.installation_id}:${jobData.repository_id}]`;
}

function getJobId(jobData: RepoJobData) {
  return `[job::${jobData.installation_id}:${jobData.repository_id}]`;
}

export function scheduleJob(jobData: RepoJobData, options: {
  cron: string;
  immediately?: boolean;
  jobPriority?: JobPriority;
}) {
  const { cron, immediately = false, jobPriority = JobPriority.Normal } = options;
  return jobQueue.upsertJobScheduler(
    getJobSchedulerId(jobData),
    {
      pattern: cron,
      immediately,
    },
    {
      name: getJobId(jobData),
      data: jobData,
      opts: {
        priority: jobPriority,
        attempts: 1,
        deduplication: {
          id: getJobId(jobData),
        }
      },
    },
  );
}

export function addJob(jobData: RepoJobData, jobPriority = JobPriority.High) {
  return jobQueue.add(
    getJobId(jobData),
    jobData,
    {
      priority: jobPriority,
      deduplication: {
        id: getJobId(jobData),
      }
    },
  );
}

export function unscheduleJob(jobData: RepoJobData) {
  return Promise.all([
    jobQueue.removeJobScheduler(getJobSchedulerId(jobData)),
    jobQueue.remove(getJobId(jobData)),
  ]);
}
