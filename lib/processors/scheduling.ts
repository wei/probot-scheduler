import Repository, { RepositorySchemaType } from "@/models/Repository.ts";
import { addJob, scheduleJob, unscheduleJob } from "@/lib/queue/index.ts";

export async function scheduleInstallation({
  installationId,
  triggerImmediately = false,
  repositoryRecords,
}: {
  installationId: number;
  triggerImmediately?: boolean;
  repositoryRecords?: RepositorySchemaType[];
}) {
  console.log("Scheduling installation", installationId);

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
  console.log("Unscheduling installation", installationId);

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
    addJob({
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
