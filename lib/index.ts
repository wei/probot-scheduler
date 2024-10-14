import { Probot } from "probot";
import handleInstallation from "@/lib/handlers/installation.ts";
import handleInstallationRepositories from "@/lib/handlers/installation-repositories.ts";
import handleInstallationTarget from "@/lib/handlers/installation-target.ts";

function app(app: Probot) {
  // listen to installation events
  app.on(
    ["installation"],
    handleInstallation.bind(null, app),
  );

  app.on(
    ["installation_repositories"],
    handleInstallationRepositories.bind(null, app),
  );

  app.on(
    ["installation_target"],
    handleInstallationTarget.bind(null, app),
  );

  app.onAny((context) => {
    app.log.info({
      event: context.name,
      action: "action" in context.payload ? context.payload.action : "none",
    });
  });
}

export default app;
