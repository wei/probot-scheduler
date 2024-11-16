import type { DataService } from "./data-service.ts";
import type { Context, Probot } from "probot";
import type {
  InstallationSchemaType,
  RepositorySchemaType,
} from "@src/models/index.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";
import type { SchedulingService } from "./scheduling-service.ts";
import pluralize from "@wei/pluralize";

export class InstallationService {
  constructor(
    private app: Probot,
    private dataService: DataService,
    private jobSchedulingService: SchedulingService,
    private options: SchedulerAppOptions | null,
  ) {}

  //#region Webhook Event Handlers
  async handleInstallationEvent(context: Context<"installation">) {
    const {
      action,
      repositories,
      installation: {
        id: installationId,
        account,
        repository_selection: selection,
      },
    } = context.payload;

    context.log = context.log.child({
      service: "InstallationService",
      event: context.name,
      action,
      account: account.id,
      accountType: account.type,
      accountName: account.login,
      installationId,
      selection: selection,
    });

    switch (action) {
      case "created":
        context.log.info(
          {
            repositoryCount: repositories?.length,
            repositoryIds: repositories?.map((repo) => repo.id),
            repositoryNames: repositories?.map((repo) => repo.full_name),
          },
          `🎉 ${account.type} ${account.login} installed on ${
            pluralize("repository", repositories?.length, true)
          }`,
        );
        await this.processSetupInstallation(context);
        break;
      case "deleted":
        context.log.info(`😭 ${account.type} ${account.login} uninstalled`);

        await this.processDeleteInstallation(installationId);
        break;
      case "new_permissions_accepted":
        context.log.info(
          `🔐 ${account.type} ${account.login} accepted new permissions`,
        );

        await this.processSetupInstallation(context);
        break;
      case "suspend":
        context.log.info(`🚫 ${account.type} ${account.login} suspended`);

        await this.processSuspendInstallation(installationId);
        break;
      case "unsuspend":
        context.log.info(`👍 ${account.type} ${account.login} unsuspended`);

        await this.processSetupInstallation(context);
        break;
      default:
        context.log.warn(
          `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
        );
        break;
    }
  }

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

  async handleInstallationTargetEvent(context: Context<"installation_target">) {
    const {
      action,
      installation: { id: installationId },
      account,
      changes: { login: oldLogin },
    } = context.payload;

    context.log = context.log.child({
      service: "InstallationService",
      event: context.name,
      action,
      account: account.id,
      accountType: account.type,
      accountName: account.login,
      installationId,
    });

    switch (action) {
      case "renamed":
        context.log.info(
          `♻️ ${account.type} ${account.login} renamed from ${oldLogin}`,
        );

        await this.processSetupInstallation(context);
        break;
      default:
        context.log.warn(
          `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
        );
        break;
    }
  }
  //#endregion

  //#region Installation Management
  async processSetupInstallation(context: Context<"installation">) {
    return await this.processInstallation(
      context.payload.installation.id,
      {
        triggerImmediately: ["created", "unsuspend", "new_permissions_accepted"]
          .includes(context.payload.action),
      },
    );
  }

  async processInstallation(
    installationId: number,
    { triggerImmediately }: { triggerImmediately?: boolean } = {},
  ) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId,
    });

    try {
      const octokit = await this.app.auth(installationId);
      const installation = (await octokit.apps.getInstallation({
        installation_id: installationId,
      })).data;

      await this.dataService.saveInstallation(
        installation as InstallationSchemaType,
      );

      log.info(`🗑️ Unschedule installation before processing`);
      const { repositories: existingRepositories } = await this
        .dataService.getInstallation(installationId);
      await this.jobSchedulingService.unscheduleRepositories(
        existingRepositories,
      );

      if (installation.suspended_at) {
        log.info(`⏭️ Skip processing for suspended installation`);
        return;
      }

      const installedRepositories = await octokit.paginate(
        octokit.apps.listReposAccessibleToInstallation,
        { per_page: 100 },
      ) as unknown as RepositorySchemaType[]; // TODO: Type fixed in https://github.com/octokit/plugin-paginate-rest.js/issues/350 upgrade probot to pick it up

      await this.dataService.updateRepositories(
        installationId,
        installedRepositories,
      );

      log.info(`Schedule installation ${installationId}`);
      for (const repository of installedRepositories) {
        await this.processRepository({
          installationId,
          repositoryId: repository.id,
        }, triggerImmediately);
      }

      return { installation, repositories: installedRepositories };
    } catch (err) {
      log.error(err, `❌ Failed to process installation ${installationId}`);
      throw new Error(`Failed to process installation`);
    }
  }

  async processDeleteInstallation(installationId: number) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId,
    });

    log.info(`🗑️ Unschedule installation before deleting`);
    const { repositories } = await this.dataService.getInstallation(
      installationId,
    );
    await this.jobSchedulingService.unscheduleRepositories(
      repositories,
    );
    await this.dataService.deleteInstallation(installationId);
  }

  async processSuspendInstallation(installationId: number) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId,
    });

    log.info(`🗑️ Unschedule installation before suspending`);
    const { repositories, installation } = await this.dataService
      .getInstallation(installationId);
    await this.jobSchedulingService.unscheduleRepositories(
      repositories,
    );
    await this.dataService.saveInstallation(installation);
    await this.dataService.deleteInstallation(installationId);
  }
  //#endregion

  //#region Installation Repositories Management
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
        } as RepositorySchemaType;

        await this.dataService.addRepository(installationId, repo);

        return await this.processRepository({
          installationId,
          repositoryId: id,
        }, true);
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
  //#endregion

  //#region Helper Methods
  async getInstallation(installationId: number) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId,
    });

    log.debug(`🔍 Getting installation`);

    const octokit = await this.app.auth(installationId);
    const installation =
      (await octokit.apps.getInstallation({ installation_id: installationId }))
        .data;
    const repositories = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    ) as unknown as RepositorySchemaType[];

    log.debug({
      repositoryCount: repositories.length,
      repositoryIds: repositories.map((repo) => repo.id),
      repositoryNames: repositories.map((repo) => repo.full_name),
    }, `✅ Got installation`);

    return { installation, repositories };
  }

  async getRepository(searchOpts: {
    installationId?: number;
    repositoryId?: number;
    fullName?: string;
  }) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId: searchOpts.installationId,
      repositoryId: searchOpts.repositoryId,
      repositoryName: searchOpts.fullName,
    });

    log.debug(`🔍 Get repository`);

    return await this.dataService.getRepository(searchOpts);
  }

  async getInstallationByLogin(installationLogin: string) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationLogin,
    });

    log.info(`🔍 Get installation by login`);

    const installation = await this.dataService
      .getInstallationByLogin(installationLogin);

    if (!installation) {
      log.warn(`⚠️ Installation not found`);
      throw new Error(`Installation not found`);
    }

    return await this.getInstallation(installation.id);
  }

  async getInstallationByLoginOrId(installationIdOrLogin: string) {
    const installationId = installationIdOrLogin.match(/^\d+$/)
      ? Number(installationIdOrLogin)
      : undefined;
    return await (installationId
      ? this.getInstallation(installationId)
      : this.getInstallationByLogin(installationIdOrLogin));
  }

  async processRepository(searchOpts: {
    installationId?: number;
    repositoryId?: number;
    fullName?: string;
  }, triggerImmediately: boolean = false) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId: searchOpts.installationId,
      repositoryId: searchOpts.repositoryId,
      repositoryName: searchOpts.fullName,
    });

    log.debug(`🏃 Process repository`);
    try {
      const repository = await this.getRepository(searchOpts);
      if (!repository) {
        throw new Error(`Repository not found`);
      }
      const currentMetadata = await this.dataService.getRepositoryMetadata(
        repository.id,
      );

      let metadata = currentMetadata;
      if (this.options?.getRepositorySchedule) {
        metadata = await this.options.getRepositorySchedule(
          repository,
          currentMetadata ?? undefined,
        );
      }

      if (metadata) {
        await this.dataService.updateRepositoryMetadata(metadata);
      }

      await this.jobSchedulingService.scheduleRepository(
        repository,
        metadata,
        {
          triggerImmediately,
        },
      );
      return repository;
    } catch (err) {
      log.error(err, `❌ Failed to process repository`);
      throw new Error(`Failed to process repository`);
    }
  }

  async processInstallationByLogin(
    installationLogin: string,
    opts?: { triggerImmediately?: boolean },
  ) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationLogin,
    });

    log.debug(`🏃 Processing installation by login`);

    const installation = await this.dataService
      .getInstallationByLogin(installationLogin);

    if (!installation) {
      log.warn(`⚠️ Installation not found`);
      return new Error(`Installation not found: ${installationLogin}`);
    }

    return await this.processInstallation(installation.id, opts);
  }

  async processInstallationByLoginOrId(
    installationIdOrLogin: string,
    opts?: { triggerImmediately?: boolean },
  ) {
    const installationId = installationIdOrLogin.match(/^\d+$/)
      ? Number(installationIdOrLogin)
      : undefined;
    return installationId
      ? await this.processInstallation(installationId, opts)
      : await this.processInstallationByLogin(installationIdOrLogin, opts);
  }
  //#endregion
}
