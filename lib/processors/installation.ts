import type { Context, Probot } from "probot";
import type { AnyBulkWriteOperation } from "mongoose";
import Installation from "@/db/Installation.ts";
import Repository, { type RepositorySchemaType } from "@/db/Repository.ts";
import {
  scheduleInstallation,
  unscheduleInstallation,
} from "@/lib/processors/scheduling.ts";

export function setUpInstallation({
  app,
  context: {
    payload: {
      action,
      installation: {
        id: installationId,
      },
    },
  },
}: {
  app: Probot;
  context: Context<"installation">;
}) {
  return processInstallation({
    app,
    installationId,
    triggerImmediately: ["created", "unsuspend", "new_permissions_accepted"]
      .includes(action),
  });
}

export async function processInstallation({
  app,
  installationId,
  triggerImmediately = false,
}: {
  app: Probot;
  installationId: number;
  triggerImmediately?: boolean;
}) {
  const octokit = await app.auth(installationId);

  const installation = (await octokit.apps.getInstallation({
    installation_id: installationId,
  })).data as unknown as Context<"installation">["payload"]["installation"];

  /**
   * Update installation
   */
  await Installation.findOneAndUpdate(
    { id: installationId },
    installation,
    { new: true, upsert: true },
  ).lean();

  await unscheduleInstallation({ installationId });

  if (
    installation.suspended_at
  ) {
    app.log.info(
      `ℹ️ Skipping reset for suspended installation ${installationId}`,
    );
    return;
  }

  /**
   * Update repositories
   */
  try {
    const installedRepositories = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    ) as unknown as RepositorySchemaType[]; // TODO: Type fixed in https://github.com/octokit/plugin-paginate-rest.js/issues/350 upgrade probot to pick it up

    const existingRepositoriesIds = await Repository.find(
      { installation_id: installationId },
      { id: 1, _id: 0 },
    ).lean();

    const repositoriesToAdd: RepositorySchemaType[] = [];
    const repositoriesToUpdate: RepositorySchemaType[] = [];
    const existingRepositoriesIdSet: Set<number> = new Set(
      existingRepositoriesIds.map((r) => r.id),
    );

    // Determine repositories to add, update, and remove
    for (const repo of installedRepositories) {
      if (existingRepositoriesIdSet.has(repo.id)) {
        repositoriesToUpdate.push(repo);
        existingRepositoriesIdSet.delete(repo.id);
      } else {
        repositoriesToAdd.push(repo);
      }
    }

    const repositoryIdsToRemove = [
      ...existingRepositoriesIdSet,
    ];

    // Update MongoDB
    const bulkOps: AnyBulkWriteOperation<RepositorySchemaType>[] = [];

    // Add repositories
    for (const repo of repositoriesToAdd) {
      bulkOps.push({
        insertOne: {
          document: {
            ...repo,
            installation_id: installationId,
          },
        },
      });
    }

    // Remove repositories
    if (repositoryIdsToRemove.length > 0) {
      bulkOps.push({
        deleteMany: {
          filter: {
            id: { $in: repositoryIdsToRemove },
            installation_id: installationId,
          },
        },
      });
    }

    // Update repositories
    for (const repo of repositoriesToUpdate) {
      if (repo) {
        bulkOps.push({
          updateOne: {
            filter: { id: repo.id },
            update: {
              $set: {
                ...repo,
                installation_id: installationId,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Repository.bulkWrite(bulkOps);
    }

    await scheduleInstallation({ installationId, triggerImmediately });

    return { installation, repositories: installedRepositories };
  } catch (err) {
    app.log.error(
      err,
      `❌ Failed to retrieve repositories for ${installationId}`,
    );
    throw new Error(`Failed to retrieve repositories for ${installationId}`);
  }
}

export async function deleteInstallation({
  app: _app,
  context: { log, payload },
}: {
  app: Probot;
  context: Context<"installation">;
}) {
  const { installation } = payload;

  log.info(`ℹ️ Deleting installation ${installation.account.login}`);

  await unscheduleInstallation({ installationId: installation.id });

  // Delete installation and repositories concurrently
  await Promise.all([
    Installation.findOneAndDelete({ id: installation.id }),
    Repository.deleteMany({ installation_id: installation.id }),
  ]);
}

export async function suspendInstallation({
  app: _app,
  context: { log, payload },
}: {
  app: Probot;
  context: Context<"installation">;
}) {
  const { installation } = payload;

  log.info(`ℹ️ Suspending installation ${installation.account.login}`);

  await unscheduleInstallation({ installationId: installation.id });

  await Installation.findOneAndUpdate(
    { id: installation.id },
    installation,
    { new: true, upsert: true },
  ).lean();
}

export async function getInstallation({
  app,
  installationId,
}: {
  app: Probot;
  installationId: number;
}) {
  const installation = await Installation.findOne({ id: installationId })
    .lean();
  if (!installation) {
    app.log.warn(`Installation not found: ${installationId}`);
    throw new Error(`Installation not found: ${installationId}`);
  }

  const repositories = await Repository.find({
    installation_id: installationId,
  }).lean();

  return { installation, repositories };
}
