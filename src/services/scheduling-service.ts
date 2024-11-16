import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import type {
  RepositoryMetadataSchemaType,
  RepositorySchemaType,
} from "@src/models/index.ts";
import {
  JobPriority,
  QueueName,
  type SchedulerJobData,
} from "@src/utils/types.ts";

export class SchedulingService {
  private repoJobQueue: Queue;
  private log: Logger;

  constructor(redisClient: Redis, logger: Logger) {
    this.repoJobQueue = new Queue(QueueName.RepoJobQueue, {
      connection: redisClient,
    });
    this.log = logger.child({
      service: "JobSchedulingService",
    });
  }

  private getId(
    type: "job-scheduler" | "job" | "oneoff-job",
    jobData: Pick<SchedulerJobData, "installation_id" | "repository_id">,
    suffix?: string,
  ) {
    return `[${type}_${jobData.installation_id}_${jobData.repository_id}${
      suffix ? `_${suffix}` : ""
    }]`;
  }

  async scheduleJob(jobData: SchedulerJobData, options: {
    cron: string;
    jobPriority?: JobPriority;
  }) {
    const {
      cron,
      jobPriority = JobPriority.Normal,
    } = options;

    this.log.debug({ jobData, cron, jobPriority }, "Scheduling job");
    return await this.repoJobQueue.upsertJobScheduler(
      this.getId("job-scheduler", jobData),
      {
        pattern: cron,
        // Immediately seem to have a bug and ignores pattern (cron) when set
        immediately: false,
      },
      {
        name: this.getId("job", jobData),
        data: jobData,
        opts: {
          priority: jobPriority,
        },
      },
    );
  }

  async addJob(
    jobData: SchedulerJobData,
    jobPriority: JobPriority = JobPriority.High,
  ) {
    const jobId = this.getId("oneoff-job", jobData, Date.now().toString());
    this.log.debug({ jobData, jobPriority, jobId }, "Adding one-off job");
    return await this.repoJobQueue.add(
      jobId,
      jobData,
      {
        jobId,
        priority: jobPriority,
      },
    );
  }

  async unscheduleJob(
    jobData: Pick<SchedulerJobData, "installation_id" | "repository_id">,
  ) {
    this.log.debug({ jobData }, "Unscheduling job");
    await this.repoJobQueue.removeJobScheduler(
      this.getId("job-scheduler", jobData),
    );
  }

  async scheduleRepository(
    repository: RepositorySchemaType,
    metadata: RepositoryMetadataSchemaType | null,
    { triggerImmediately }: { triggerImmediately?: boolean } = {},
  ) {
    const {
      id: repository_id,
      installation_id,
      owner: { login: owner },
      name: repo,
    } = repository;

    if (metadata) {
      this.log.debug({
        repository_id,
        installation_id,
        owner,
        repo,
        triggerImmediately,
        metadata,
      }, "Scheduling repository");

      await this.scheduleJob(
        {
          installation_id,
          repository_id,
          owner,
          repo,
          metadata,
        },
        {
          cron: metadata.cron,
          jobPriority: metadata.job_priority,
        },
      );
    } else {
      this.log.debug(
        {
          repository_id,
          installation_id,
          owner,
          repo,
          triggerImmediately,
        },
        "Skipping scheduling repository as no metadata found",
      );
    }

    if (triggerImmediately) {
      await this.addJob({
        installation_id,
        repository_id,
        owner,
        repo,
        metadata,
      }, JobPriority.High);
    }
  }

  async unscheduleRepository(repository: RepositorySchemaType) {
    const {
      id: repository_id,
      installation_id,
      full_name,
    } = repository;

    this.log.debug(
      { repository_id, installation_id, full_name },
      "Unscheduling repository",
    );

    await this.unscheduleJob({
      installation_id,
      repository_id,
    });
  }

  async unscheduleRepositories(
    repositories: RepositorySchemaType[],
  ) {
    this.log.debug(
      { repositoryCount: repositories.length },
      "Unscheduling installation",
    );
    for (const repository of repositories) {
      await this.unscheduleRepository(repository);
    }
  }
}
