import type { DataService } from "./data-service.ts";
import type { Context, Probot } from "probot";
import type { InstallationModelSchemaType } from "@src/models/installation-model.ts";
import type { RepositoryModelSchemaType } from "@src/models/repository-model.ts";
import type { SchedulingService } from "./scheduling-service.ts";
import pluralize from "@wei/pluralize";

export class InstallationService {
  constructor(
    private app: Probot,
    private dataService: DataService,
    private jobSchedulingService: SchedulingService,
  ) {}

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
        await this.setUpInstallation(context);
        break;
      case "deleted":
        context.log.info(`😭 ${account.type} ${account.login} uninstalled`);

        await this.deleteInstallation(installationId);
        break;
      case "new_permissions_accepted":
        context.log.info(
          `🔐 ${account.type} ${account.login} accepted new permissions`,
        );

        await this.setUpInstallation(context);
        break;
      case "suspend":
        context.log.info(`🚫 ${account.type} ${account.login} suspended`);

        await this.suspendInstallation(installationId);
        break;
      case "unsuspend":
        context.log.info(`👍 ${account.type} ${account.login} unsuspended`);

        await this.setUpInstallation(context);
        break;
      default:
        context.log.warn(
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

        await this.setUpInstallation(context);
        break;
      default:
        context.log.warn(
          `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
        );
        break;
    }
  }

  async setUpInstallation(context: Context<"installation">) {
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
        installation as InstallationModelSchemaType,
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
      ) as unknown as RepositoryModelSchemaType[]; // TODO: Type fixed in https://github.com/octokit/plugin-paginate-rest.js/issues/350 upgrade probot to pick it up

      await this.dataService.updateRepositories(
        installationId,
        installedRepositories,
      );

      log.info(`Schedule installation ${installationId}`);
      const { repositories } = await this.dataService
        .getInstallation(
          installationId,
        );
      await this.jobSchedulingService.scheduleRepositories(
        repositories,
        { triggerImmediately },
      );

      return { installation, repositories: installedRepositories };
    } catch (err) {
      log.error(err, `❌ Failed to process installation ${installationId}`);
      throw new Error(`Failed to process installation`);
    }
  }

  async deleteInstallation(installationId: number) {
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

  async suspendInstallation(installationId: number) {
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

  // Helpers methods
  async processInstallationByLogin(installationLogin: string) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationLogin,
    });

    log.info(`🏃 Processing installation by login`);

    const installation = await this.dataService
      .getInstallationByLogin(installationLogin);

    if (!installation) {
      log.warn(`⚠️ Installation not found`);
      return new Error(`Installation not found: ${installationLogin}`);
    }

    return this.processInstallation(installation.id, {
      triggerImmediately: true,
    });
  }

  async getInstallationByLogin(installationLogin: string) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationLogin,
    });

    log.info(`🔍 Getting installation by login`);

    const installation = await this.dataService
      .getInstallationByLogin(installationLogin);

    if (!installation) {
      log.warn(`⚠️ Installation not found`);
      throw new Error(`Installation not found`);
    }

    return this.getInstallation(installation.id);
  }

  async getInstallation(installationId: number) {
    const log = this.app.log.child({
      service: "InstallationService",
      installationId,
    });

    log.info(`🔍 Getting installation`);

    const octokit = await this.app.auth(installationId);
    const installation =
      (await octokit.apps.getInstallation({ installation_id: installationId }))
        .data;
    const repositories = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    ) as unknown as RepositoryModelSchemaType[];

    log.info({
      repositoryCount: repositories.length,
      repositoryIds: repositories.map((repo) => repo.id),
      repositoryNames: repositories.map((repo) => repo.full_name),
    }, `✅ Got installation`);

    return { installation, repositories };
  }

  async getRepositoryByFullName(fullName: string) {
    const log = this.app.log.child({
      service: "InstallationService",
      repositoryName: fullName,
    });

    log.info(`🔍 Getting repository by full name`);

    return await this.dataService.getRepository({ fullName });
  }

  async processRepositoryByFullName(fullName: string) {
    const log = this.app.log.child({
      service: "InstallationService",
      repositoryName: fullName,
    });

    log.info(`🏃 Processing repository`);

    try {
      const repository = await this.getRepositoryByFullName(fullName);
      if (!repository) {
        throw new Error(`Repository not found`);
      }
      await this.jobSchedulingService.scheduleRepository(repository, {
        triggerImmediately: true,
      });

      return repository;
    } catch (err) {
      log.error(err, `❌ Failed to process repository by id`);
      throw new Error(`Failed to process repository`);
    }
  }
}
