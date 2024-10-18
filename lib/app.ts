import { Probot } from "probot";
import handleInstallation from "@/lib/webhook-handlers/installation.ts";
import handleInstallationRepositories from "@/lib/webhook-handlers/installation-repositories.ts";
import handleInstallationTarget from "@/lib/webhook-handlers/installation-target.ts";

function app(app: Probot) {
  app.on("installation", handleInstallation.bind(null, app));

  app.on(
    "installation_repositories",
    handleInstallationRepositories.bind(null, app),
  );

  app.on(
    "installation_target",
    handleInstallationTarget.bind(null, app),
  );

  // app.onAny((context) => {
  //   app.log.info({
  //     event: context.name,
  //     action: "action" in context.payload ? context.payload.action : "none",
  //   });
  // });
}

export default app;
