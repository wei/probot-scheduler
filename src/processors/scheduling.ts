import { Repository, type RepositorySchemaType } from "@src/db/index.ts";
import { addJob, scheduleJob, unscheduleJob } from "@src/queue/index.ts";
import logger from "@src/utils/logger.ts";

export async function scheduleInstallation({
  installationId,
  triggerImmediately = false,
  repositoryRecords,
}: {
  installationId: number;
  triggerImmediately?: boolean;
  repositoryRecords?: RepositorySchemaType[];
}) {
  logger.info({ installationId }, "Scheduling installation");

  const repositories = repositoryRecords ??
    await Repository.find({
      installation_id: installationId,
    }).lean();

  for (const repository of repositories) {
    await scheduleRepository(repository, { triggerImmediately });
  }
}

export async function unscheduleInstallation({
  installationId,
}: {
  installationId: number;
}) {
  logger.info({ installationId }, "Unscheduling installation");

  const repositories = await Repository.find({
    installation_id: installationId,
  }).lean();

  for (const repository of repositories) {
    await unscheduleRepository(repository);
  }
}

export async function scheduleRepository(repository: RepositorySchemaType, {
  triggerImmediately,
}: {
  triggerImmediately?: boolean;
} = {}) {
  const {
    id: repository_id,
    installation_id,
    full_name,
  } = repository;

  await scheduleJob(
    {
      installation_id,
      repository_id,
      full_name,
      inserted_at: new Date(),
    },
    {
      cron: "* * * * *", // TODO: Change this to a more reasonable value
    },
  );

  if (triggerImmediately) {
    await addJob({
      installation_id,
      repository_id,
      full_name,
      inserted_at: new Date(),
    });
  }
}

export async function unscheduleRepository(repository: RepositorySchemaType) {
  const {
    id: repository_id,
    installation_id,
    full_name,
  } = repository;

  await unscheduleJob({
    installation_id,
    repository_id,
    full_name,
    inserted_at: new Date(),
  });
}
