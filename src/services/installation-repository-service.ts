import pluralize from "@wei/pluralize";
import type { Context, Probot } from "probot";
import type { RepositoryModelSchemaType } from "@src/models/repository-model.ts";
import type { DataService } from "./data-service.ts";
import type { JobSchedulingService } from "./scheduling-service.ts";

export class InstallationRepositoryService {
  constructor(
    private app: Probot,
    private dataService: DataService,
    private jobSchedulingService: JobSchedulingService,
  ) {}

  async handleInstallationRepositoriesEvent(
    context: Context<"installation_repositories">,
  ) {
    const {
      action,
      repositories_added: added,
      repositories_removed: removed,
      installation: {
        id: installationId,
        account,
        repository_selection: selection,
      },
    } = context.payload;

    const log = context.log.child({
      event: context.name,
      action,
      account: account.id,
      accountType: account.type,
      accountName: account.login,
      installationId,
      selection: selection,
    });

    switch (action) {
      case "added":
        log.info(
          {
            repositoryCount: added.length,
            repositoryIds: added.map((repo) => repo.id),
            repositoryNames: added.map((repo) => repo.full_name),
          },
          `➕ ${account.type} ${account.login} added ${
            pluralize("repository", added.length, true)
          }`,
        );

        try {
          await this.processAddInstallationRepositories(context);
          log.debug(
            `✅ Successfully processed ${context.name}.${action} for ${account.login}`,
          );
        } catch (err) {
          log.error(
            err,
            `❌ Failed to add or schedule some repositories, triggering full installation setup`,
          );
          throw err;
        }
        break;
      case "removed":
        log.info(
          {
            repositoryCount: removed.length,
            repositoryIds: removed.map((repo) => repo.id),
            repositoryNames: removed.map((repo) => repo.full_name),
          },
          `➖ ${account.type} ${account.login} removed ${
            pluralize("repository", removed.length, true)
          }`,
        );

        try {
          await this.processRemoveInstallationRepositories(context);
          log.debug(
            `✅ Successfully processed ${context.name}.${action} for ${account.login}`,
          );
        } catch (err) {
          log.error(
            err,
            `❌ Failed to remove or unschedule some repositories, triggering full installation setup`,
          );
          throw err;
        }
        break;
      default:
        log.warn(
          `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
        );
        break;
    }
  }

  private async processAddInstallationRepositories(
    context: Context<"installation_repositories">,
  ) {
    const {
      installation: {
        id: installationId,
        account: { login: owner },
        suspended_at,
      },
      repositories_added,
    } = context.payload;

    const octokit = await this.app.auth(installationId);

    for (const { id, name, full_name } of repositories_added) {
      const log = context.log.child({
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
        const { data } = await octokit.repos.get({
          owner,
          repo: name,
        });

        const repo = {
          ...data,
          installation_id: installationId,
        } as RepositoryModelSchemaType;

        await this.dataService.addRepository(installationId, repo);
        await this.jobSchedulingService.scheduleRepository(repo, {
          triggerImmediately: true,
        });
      } catch (err) {
        log.error(
          err,
          `❌ Failed to save or schedule repository`,
        );
        throw err;
      }
    }
  }

  private async processRemoveInstallationRepositories(
    context: Context<"installation_repositories">,
  ) {
    const {
      installation: {
        id: installationId,
      },
      repositories_removed,
    } = context.payload;

    for (const repo of repositories_removed) {
      const log = context.log.child({
        repositoryId: repo.id,
        repositoryFullName: repo.full_name,
      });

      try {
        log.info(`➖ Removing repository`);

        const deletedRepo = await this.dataService.deleteRepository(
          installationId,
          repo.id,
        );

        if (deletedRepo) {
          await this.jobSchedulingService.unscheduleRepository(
            deletedRepo,
          );
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
}
