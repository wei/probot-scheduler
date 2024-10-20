import type { ApplicationFunctionOptions, Probot } from "probot";
import handleInstallation from "@src/webhook/installation.ts";
import handleInstallationRepositories from "@src/webhook/installation-repositories.ts";
import handleInstallationTarget from "@src/webhook/installation-target.ts";
import { fullSync } from "@src/utils/full-sync.ts";

interface SchedulerAppOptions extends ApplicationFunctionOptions {
  skipFullSync?: boolean;
}

async function scheduler(app: Probot, opts: SchedulerAppOptions) {
  if (!opts.skipFullSync) {
    await fullSync(app);
  }

  app.on("installation", handleInstallation.bind(null, app));

  app.on(
    "installation_repositories",
    handleInstallationRepositories.bind(null, app),
  );

  app.on(
    "installation_target",
    handleInstallationTarget.bind(null, app),
  );
}

export default scheduler;
