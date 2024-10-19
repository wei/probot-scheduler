import { Context, type Probot } from "probot";
import Repository from "@/db/Repository.ts";
import {
  scheduleRepository,
  unscheduleRepository,
} from "@/lib/processors/scheduling.ts";

export async function processAddInstallationRepositories({
  app,
  context: {
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
  app: Probot;
  context: Context<"installation_repositories">;
}) {
  for (const { id, name, full_name } of repositories_added) {
    try {
      if (suspended_at) {
        app.log.info(
          `ℹ️ Suspended installation. Skipping add repository ${installationId}:${id}:${full_name}`,
        );
        continue;
      }
      app.log.info(`➕ Add repository ${installationId}:${id}:${full_name}`);

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
      app.log.error(
        err,
        `❌ Failed to save or schedule repository ${installationId}:${id}:${full_name}`,
      );
      throw err;
    }
  }
}

export async function processRemoveInstallationRepositories({
  app,
  context: {
    payload: {
      installation: {
        id: installationId,
      },
      repositories_removed,
    },
  },
}: {
  app: Probot;
  context: Context<"installation_repositories">;
}) {
  for (const repo of repositories_removed) {
    try {
      app.log.info(
        `➖ Remove repository ${installationId}:${repo.id}:${repo.full_name}`,
      );

      const deletedRepo = await Repository.findOneAndDelete({
        id: repo.id,
        installation_id: installationId,
      });

      if (deletedRepo) {
        await unscheduleRepository(deletedRepo);
      }
    } catch (err) {
      app.log.error(
        err,
        `❌ Failed to delete or unschedule repository ${installationId}:${repo.id}:${repo.full_name}`,
      );
      throw err;
    }
  }
}
