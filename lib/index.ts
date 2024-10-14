import { Probot } from "probot";
import handleInstallation from "@/lib/handle-installation.ts";
import handleInstallationRepositories from "@/lib/handle-installation-repositories.ts";

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

  app.onAny((context) => {
    app.log.info({
      event: context.name,
      action: "action" in context.payload ? context.payload.action : "none",
    });
  });
}

export default app;
