import type { Context, Probot } from "probot";
import pluralize from "pluralize";
import appConfig from "@/lib/app-config.ts";
import { setUpInstallation } from "./common/process-installation.ts";

function handleInstallationRepositories(
  app: Probot,
  context: Context<"installation_repositories">,
) {
  const {
    action,
    repositories_added: added,
    repositories_removed: removed,
    installation: { account, repository_selection: selection },
  } = context.payload;

  const log = context.log.child({
    name: appConfig().name,
    event: context.name,
    action,
    account: account.id,
    accountType: account.type.toLowerCase(),
    accountName: account.login,
    selection: selection,
  });

  switch (action) {
    case "added":
      log.info(
        `➕ ${account.type} ${account.login} added ${
          pluralize(
            "repository",
            added.length,
            true,
          )
        }`,
      );

      setUpInstallation({
        app,
        context,
      });
      break;
    case "removed":
      log.info(
        `➖ ${account.type} ${account.login} removed ${
          pluralize(
            "repository",
            removed.length,
            true,
          )
        }`,
      );

      setUpInstallation({
        app,
        context,
      });
      break;
    default:
      log.warn(
        `Unhandled event installation_repositories.${action} by ${account.login}`,
      );
      break;
  }
}

export default handleInstallationRepositories;
