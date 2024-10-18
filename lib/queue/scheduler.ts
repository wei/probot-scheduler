import { jobQueue, JobPriority, JobData } from "./index.ts";

function getJobSchedulerId(jobData: JobData) {
  return `[job-scheduler::${jobData.installation_id}:${jobData.repository_id}]`;
}

function getJobId(jobData: JobData) {
  return `[job::${jobData.installation_id}:${jobData.repository_id}]`;
}

export function scheduleJob(jobData: JobData, options: {
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
        deduplication: {
          id: getJobId(jobData),
        }
      },
    },
  );
}

export function addJob(jobData: JobData, jobPriority = JobPriority.High) {
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

export function unscheduleJob(jobData: JobData) {
  return Promise.all([
    jobQueue.removeJobScheduler(getJobSchedulerId(jobData)),
    jobQueue.remove(getJobId(jobData)),
  ]);
}
