import type { Probot } from "probot";
import type { SchedulerAppOptions } from "@src/utils/types.ts";
import { fullSync } from "@src/utils/full-sync.ts";
import {
  installationRepositoriesWebhookEventHandler,
  installationTargetWebhookEventHandler,
  installationWebhookEventHandler,
} from "./handlers/webhook-handlers.ts";

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
