import type { Context, Probot } from "probot";
import { createInstallationService } from "@src/services/service-factory.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";

export const installationWebhookEventHandler = async (
  app: Probot,
  opts: SchedulerAppOptions,
  context: Context<"installation">,
) => {
  const installationService = createInstallationService(app, opts);
  await installationService.handleInstallationEvent(context);
};

export const installationTargetWebhookEventHandler = async (
  app: Probot,
  opts: SchedulerAppOptions,
  context: Context<"installation_target">,
) => {
  const installationService = createInstallationService(app, opts);
  await installationService.handleInstallationTargetEvent(context);
};

export const installationRepositoriesWebhookEventHandler = async (
  app: Probot,
  opts: SchedulerAppOptions,
  context: Context<"installation_repositories">,
) => {
  const installationService = createInstallationService(
    app,
    opts,
  );
  await installationService.handleInstallationRepositoriesEvent(
    context,
  );
};
