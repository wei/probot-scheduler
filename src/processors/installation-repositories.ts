import type { Context } from "probot";
import { Repository } from "@src/db/index.ts";
import { scheduleRepository, unscheduleRepository } from "./scheduling.ts";

export async function processAddInstallationRepositories({
  context: {
    log: logger,
    octokit,
    payload: {
      installation: {
        id: installationId,
        account: { login: owner },
        suspended_at,
      },
      repositories_added,
    },
  },
}: {
  context: Context<"installation_repositories">;
}) {
  for (const { id, name, full_name } of repositories_added) {
    const log = logger.child({
      repositoryId: id,
      repositoryFullName: full_name,
    });

    try {
      if (suspended_at) {
        log.info(
          `ℹ️⏭️ Skipping add repository for suspended installation`,
        );
        continue;
      }
      log.info(`➕ Adding repository`);

      // Get full repository details
      const { data: repo } = await octokit.repos.get({
        owner,
        repo: name,
      });

      const newRepo = new Repository({
        ...repo,
        installation_id: installationId,
      });

      const savedRepo = await newRepo.save();
      await scheduleRepository(savedRepo, { triggerImmediately: true });
    } catch (err) {
      log.error(
        err,
        `❌ Failed to save or schedule repository`,
      );
      throw err;
    }
  }
}

export async function processRemoveInstallationRepositories({
  context: {
    log: logger,
    payload: {
      installation: {
        id: installationId,
      },
      repositories_removed,
    },
  },
}: {
  context: Context<"installation_repositories">;
}) {
  for (const repo of repositories_removed) {
    const log = logger.child({
      repositoryId: repo.id,
      repositoryFullName: repo.full_name,
    });

    try {
      log.info(`➖ Removing repository`);

      const deletedRepo = await Repository.findOneAndDelete({
        id: repo.id,
        installation_id: installationId,
      });

      if (deletedRepo) {
        await unscheduleRepository(deletedRepo);
      }
    } catch (err) {
      log.error(
        err,
        `❌ Failed to delete or unschedule repository`,
      );
      throw err;
    }
  }
}
