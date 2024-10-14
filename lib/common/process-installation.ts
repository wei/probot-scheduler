import type { Context, Probot } from "probot";
import Installation from "@/models/Installation.ts";
import Repository, { type RepositorySchemaType } from "@/models/Repository.ts";
import type { AnyBulkWriteOperation } from "mongoose";

export async function setUpInstallation({
  app: _app,
  context: { log, octokit, payload },
}: {
  app: Probot;
  context: Context<"installation">; // | Context<"installation_repositories">;
}) {
  const { installation } = payload;

  if (installation.suspended_at) {
    log.info(
      `Skipping reset for suspended installation ${installation.account.login}`,
    );
    return;
  }

  /**
   * Update installation
   */
  await Installation.findOneAndUpdate(
    { id: installation.id },
    {
      ...installation,
    },
    { new: true, upsert: true },
  ).lean();

  /**
   * Update repositories
   */
  try {
    const installedRepositories = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    ) as unknown as RepositorySchemaType[]; // TODO: Type fixed in https://github.com/octokit/plugin-paginate-rest.js/issues/350 upgrade probot to pick it up

    const existingRepositoriesIds = await Repository.find(
      { installation_id: installation.id },
      { id: 1, _id: 0 },
    ).lean();

    const repositoriesToAdd: RepositorySchemaType[] = [];
    const repositoriesToUpdate: RepositorySchemaType[] = [];
    const existingRepositoriesIdSet = new Set(
      existingRepositoriesIds.map((repo) => repo.id),
    );

    // Determine repositories to add, update, and remove
    installedRepositories.forEach((repo) => {
      if (existingRepositoriesIdSet.has(repo.id)) {
        repositoriesToUpdate.push(repo);
        existingRepositoriesIdSet.delete(repo.id);
      } else {
        repositoriesToAdd.push(repo);
      }
    });

    const repositoryIdsToRemove = [
      ...existingRepositoriesIdSet,
    ];

    // Update MongoDB
    const bulkOps: AnyBulkWriteOperation<RepositorySchemaType>[] = [];

    // Add repositories
    repositoriesToAdd.forEach((repo) => {
      bulkOps.push({
        insertOne: {
          document: {
            ...repo,
            installation_id: installation.id,
          },
        },
      });
    });

    // Remove repositories
    if (repositoryIdsToRemove.length > 0) {
      bulkOps.push({
        deleteMany: {
          filter: {
            id: { $in: repositoryIdsToRemove },
            installation_id: installation.id,
          },
        },
      });
    }

    // Update repositories
    repositoriesToUpdate.forEach((repo) => {
      if (repo) {
        bulkOps.push({
          updateOne: {
            filter: { id: repo.id },
            update: {
              $set: {
                ...repo,
                installation_id: installation.id,
              },
            },
            upsert: true,
          },
        });
      }
    });

    if (bulkOps.length > 0) {
      await Repository.bulkWrite(bulkOps);
    }
  } catch (err) {
    log.error(
      err,
      `Failed to retrieve repositories for ${installation.account.login}`,
    );
  }
}

export async function deleteInstallation({
  app: _app,
  context: { log, payload },
}: {
  app: Probot;
  context: Context<"installation">; // | Context<"installation_repositories">;
}) {
  const { installation } = payload;

  log.info(`Deleting installation ${installation.account.login}`);

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
  context: Context<"installation">; // | Context<"installation_repositories">;
}) {
  const { installation } = payload;

  log.info(`Suspending installation ${installation.account.login}`);

  await Installation.findOneAndUpdate(
    { id: installation.id },
    {
      ...installation,
    },
    { new: true, upsert: true },
  ).lean();
}
