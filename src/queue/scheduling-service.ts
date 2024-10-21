import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { JobPriority, QueueName, type RepoJobData } from "@src/utils/types.ts";
import type { RepositoryModelSchemaType } from "@src/models/repository-model.ts";
import type { Logger } from "pino";

export class RepositoryJobSchedulingService {
  private repoJobQueue: Queue;
  private log: Logger;

  constructor(redisClient: Redis, logger: Logger) {
    this.repoJobQueue = new Queue(QueueName.RepoJobQueue, {
      connection: redisClient,
    });
    this.log = logger.child({
      service: "RepositoryJobSchedulingService",
    });
  }

  private getId(
    type: "job-scheduler" | "job" | "oneoff-job",
    jobData: RepoJobData,
    suffix?: string,
  ) {
    return `[${type}_${jobData.installation_id}_${jobData.repository_id}${
      suffix ? `_${suffix}` : ""
    }]`;
  }

  async scheduleJob(jobData: RepoJobData, options: {
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

  async addJob(jobData: RepoJobData, jobPriority = JobPriority.High) {
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

  async unscheduleJob(jobData: RepoJobData) {
    this.log.debug({ jobData }, "Unscheduling job");
    await this.repoJobQueue.removeJobScheduler(
      this.getId("job-scheduler", jobData),
    );
  }

  async scheduleRepositories(repositories: RepositoryModelSchemaType[], opts: {
    triggerImmediately?: boolean;
  }) {
    this.log.debug(
      { repositoryCount: repositories.length, opts },
      "Scheduling installation",
    );
    for (const repository of repositories) {
      await this.scheduleRepository(repository, {
        triggerImmediately: opts.triggerImmediately,
      });
    }
  }

  async unscheduleRepositories(
    repositories: RepositoryModelSchemaType[],
  ) {
    this.log.debug(
      { repositoryCount: repositories.length },
      "Unscheduling installation",
    );
    for (const repository of repositories) {
      await this.unscheduleRepository(repository);
    }
  }

  async scheduleRepository(repository: RepositoryModelSchemaType, {
    triggerImmediately,
  }: {
    triggerImmediately?: boolean;
  } = {}) {
    const {
      id: repository_id,
      installation_id,
      full_name,
    } = repository;

    this.log.debug({
      repository_id,
      installation_id,
      full_name,
      triggerImmediately,
    }, "Scheduling repository");

    await this.scheduleJob(
      {
        installation_id,
        repository_id,
        full_name,
      },
      {
        cron: "* * * * *",
      },
    );

    if (triggerImmediately) {
      await this.addJob({
        installation_id,
        repository_id,
        full_name,
      });
    }
  }

  async unscheduleRepository(repository: RepositoryModelSchemaType) {
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
      full_name,
    });
  }
}
