import { JobPriority, type RepoJobData, repoJobQueue } from "./index.ts";

function getId(
  type: "job-scheduler" | "job" | "oneoff-job",
  jobData: RepoJobData,
  suffix?: string,
) {
  return `[${type}_${jobData.installation_id}_${jobData.repository_id}${
    suffix ? `_${suffix}` : ""
  }]`;
}

export function scheduleJob(jobData: RepoJobData, options: {
  cron: string;
  jobPriority?: JobPriority;
}) {
  const {
    cron,
    jobPriority = JobPriority.Normal,
  } = options;

  return repoJobQueue.upsertJobScheduler(
    getId("job-scheduler", jobData),
    {
      pattern: cron,
      // Immediately seem to have a bug and ignores pattern (cron) when set
      immediately: false,
    },
    {
      name: getId("job", jobData),
      data: jobData,
      opts: {
        priority: jobPriority,
      },
    },
  );
}

export function addJob(jobData: RepoJobData, jobPriority = JobPriority.High) {
  const jobId = getId("oneoff-job", jobData, Date.now().toString());
  return repoJobQueue.add(
    jobId,
    jobData,
    {
      jobId, // Must be unique
      priority: jobPriority,
    },
  );
}

export async function unscheduleJob(jobData: RepoJobData) {
  await repoJobQueue.removeJobScheduler(getId("job-scheduler", jobData));
}
