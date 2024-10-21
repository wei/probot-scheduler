import type { Context, Probot } from "probot";
import {
  createInstallationRepositoryService,
  createInstallationService,
} from "@src/services/service-factory.ts";

export const installationWebhookEventHandler = async (
  app: Probot,
  context: Context<"installation">,
) => {
  const installationService = createInstallationService(app);
  await installationService.handleInstallationEvent(context);
};

export const installationTargetWebhookEventHandler = async (
  app: Probot,
  context: Context<"installation_target">,
) => {
  const installationService = createInstallationService(app);
  await installationService.handleInstallationTargetEvent(context);
};

export const installationRepositoriesWebhookEventHandler = async (
  app: Probot,
  context: Context<"installation_repositories">,
) => {
  const installationRepositoryService = createInstallationRepositoryService(
    app,
  );
  await installationRepositoryService.handleInstallationRepositoriesEvent(
    context,
  );
};
