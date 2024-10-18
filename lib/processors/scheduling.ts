import Repository, { RepositorySchemaType } from "@/models/Repository.ts";
import { scheduleJob, unscheduleJob } from "@/lib/queue/index.ts";

export async function scheduleInstallation({
  installationId,
  triggerImmediately = false,
  repositoryRecords,
}: {
  installationId: number;
  triggerImmediately?: boolean;
  repositoryRecords?: RepositorySchemaType[];
}) {
  const repositories = repositoryRecords ??
    await Repository.find({
      installation_id: installationId,
    }).lean();

  for (const repository of repositories) {
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
        cron: "* * * * *",  // TODO: Change this to a more reasonable value
        immediately: triggerImmediately,
      },
    )
  }
}

export async function unscheduleInstallation({
  installationId,
}: {
  installationId: number;
}) {
  const repositories = await Repository.find({
    installation_id: installationId,
  }).lean();

  for (const repository of repositories) {
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
}
