import type { Context, Probot } from "probot";
import type { AnyBulkWriteOperation } from "mongoose";
import Installation from "@/models/Installation.ts";
import Repository, { type RepositorySchemaType } from "@/models/Repository.ts";

export function setUpInstallation({
  app,
  context: { payload: { installation: { id: installationId } } },
}: {
  app: Probot;
  context: Context<"installation" | "installation_target">;
}) {
  return processInstallation({
    app,
    installationId,
  });
}

export async function processInstallation({
  app,
  installationId,
}: {
  app: Probot;
  installationId: number;
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

  if (
    installation.suspended_at
  ) {
    app.log.info(
      `Skipping reset for suspended installation ${installationId}`,
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
            installation_id: installationId,
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
            installation_id: installationId,
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
                installation_id: installationId,
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

    return { installation, repositories: installedRepositories };
  } catch (err) {
    app.log.error(
      err,
      `Failed to retrieve repositories for ${installationId}`,
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
  context: Context<"installation">;
}) {
  const { installation } = payload;

  log.info(`Suspending installation ${installation.account.login}`);

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
    app.log.warn(`Installation ${installationId} not found`);
    throw new Error(`Installation not found for Id ${installationId}`);
  }

  const repositories = await Repository.find({
    installation_id: installationId,
  }).lean();

  return { installation, repositories };
}

export async function processInstallationByLogin({
  app,
  installationLogin,
}: {
  app: Probot;
  installationLogin: string;
}) {
  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    app.log.warn(`Installation ${installationLogin} not found`);
    return new Error(`Installation not found for ${installationLogin}`);
  }

  return processInstallation({
    app,
    installationId: installation.id,
  });
}

export async function getInstallationByLogin({
  app,
  installationLogin,
}: {
  app: Probot;
  installationLogin: string;
}) {
  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    app.log.warn(`Installation ${installationLogin} not found`);
    throw new Error(`Installation not found for ${installationLogin}`);
  }

  return getInstallation({
    app,
    installationId: installation.id,
  });
}
