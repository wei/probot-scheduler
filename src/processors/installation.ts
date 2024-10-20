import type { Context, Logger, Probot } from "probot";
import type { AnyBulkWriteOperation } from "mongoose";
import { appConfig } from "@src/utils/config.ts";
import {
  Installation,
  Repository,
  type RepositorySchemaType,
} from "@src/db/index.ts";
import { scheduleInstallation, unscheduleInstallation } from "./scheduling.ts";

export function setUpInstallation({
  app,
  context: {
    log,
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
    log,
  });
}

export async function processInstallation({
  app,
  installationId,
  triggerImmediately = false,
  log,
}: {
  app: Probot;
  installationId: number;
  triggerImmediately?: boolean;
  log?: Logger;
}) {
  log = (log ?? app.log).child({
    name: appConfig.name,
    installationId,
  });

  const octokit = await app.auth(installationId);

  const installation = (await octokit.apps.getInstallation({
    installation_id: installationId,
  })).data as unknown as Context<"installation">["payload"]["installation"];

  log = log!.child({
    account: installation.account.id,
    accountType: installation.account.type,
    accountName: installation.account.login,
    installationId,
    selection: installation.repository_selection,
  });

  await Installation.findOneAndUpdate(
    { id: installationId },
    installation,
    { new: true, upsert: true },
  ).lean();

  log.info(`🗑️ Unschedule installation before processing`);
  await unscheduleInstallation({ installationId });

  if (installation.suspended_at) {
    log.info(`⏭️ Skip processing for suspended installation`);
    return;
  }

  log.info(`🏃 Processing installation`);

  try {
    const installedRepositories = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    ) as unknown as RepositorySchemaType[]; // TODO: Type fixed in https://github.com/octokit/plugin-paginate-rest.js/issues/350 upgrade probot to pick it up

    const repositoriesToAdd: RepositorySchemaType[] = [];
    const repositoriesToUpdate: RepositorySchemaType[] = [];
    const existingRepositoriesIdSet: Set<number> = new Set(
      (await Repository.find(
        { installation_id: installationId },
        { id: 1, _id: 0 },
      ).lean()).map((r) => r.id),
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
      log.debug(`💾 Updated repositories in MongoDB in bulk`);
    }

    log.info(`📅 Schedule installation ${installationId}`);
    await scheduleInstallation({ installationId, triggerImmediately });

    return { installation, repositories: installedRepositories };
  } catch (err) {
    log.error(
      err,
      `❌ Failed to retrieve repositories for installation ${installationId}`,
    );
    throw new Error(`Failed to retrieve repositories`);
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

  log.info(`🗑️ Deleting installation ${installation.account.login}`);

  await unscheduleInstallation({ installationId: installation.id });

  await Installation.findOneAndDelete({ id: installation.id });
  await Repository.deleteMany({ installation_id: installation.id });
}

export async function suspendInstallation({
  app: _app,
  context: { log, payload },
}: {
  app: Probot;
  context: Context<"installation">;
}) {
  const { installation } = payload;

  log.info(`⛔ Suspending installation ${installation.account.login}`);

  await unscheduleInstallation({ installationId: installation.id });

  await Installation.findOneAndUpdate(
    { id: installation.id },
    installation,
    { new: true, upsert: true },
  ).lean();

  await Repository.deleteMany({ installation_id: installation.id });
}

export async function getInstallation({
  app,
  installationId,
  log,
}: {
  app: Probot;
  installationId: number;
  log?: Logger;
}) {
  log = log ?? app.log;

  log.info(`📥 Getting installation ${installationId}`);

  const installation = await Installation.findOne({ id: installationId })
    .lean();
  if (!installation) {
    log.warn(`🔍 Installation not found`);
    throw new Error(`Installation not found`);
  }

  const repositories = await Repository.find({
    installation_id: installationId,
  }).lean();

  log.info(
    `📦 Found ${repositories.length} repositories for installation ${installationId}`,
  );

  return { installation, repositories };
}
