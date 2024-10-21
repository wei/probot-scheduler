import type { ApplicationFunctionOptions, Probot } from "probot";
import { fullSync } from "@src/utils/full-sync.ts";
import {
  installationRepositoriesWebhookEventHandler,
  installationTargetWebhookEventHandler,
  installationWebhookEventHandler,
} from "./handlers/webhook-handlers.ts";

interface SchedulerAppOptions extends ApplicationFunctionOptions {
  skipFullSync?: boolean;
}

async function scheduler(app: Probot, opts: SchedulerAppOptions) {
  if (!opts.skipFullSync) {
    await fullSync(app);
  }

  app.on("installation", installationWebhookEventHandler.bind(null, app));
  app.on(
    "installation_target",
    installationTargetWebhookEventHandler.bind(null, app),
  );
  app.on(
    "installation_repositories",
    installationRepositoriesWebhookEventHandler.bind(null, app),
  );
}

export default scheduler;
