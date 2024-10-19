import type { Context, Probot } from "probot";
import pluralize from "pluralize";
import appConfig from "@/lib/app-config.ts";
import {
  processAddInstallationRepositories,
  processRemoveInstallationRepositories
} from "@/lib/processors/installation-repositories.ts";
import { setUpInstallation } from "@/lib/processors/installation.ts";

async function handleInstallationRepositories(
  app: Probot,
  context: Context<"installation_repositories">,
) {
  const {
    action,
    repositories_added: added,
    repositories_removed: removed,
    installation: {
      id: installationId,
      account,
      repository_selection: selection,
    },
  } = context.payload;

  const log = context.log.child({
    name: appConfig().name,
    event: context.name,
    action,
    account: account.id,
    accountType: account.type,
    accountName: account.login,
    installationId,
    selection: selection,
  });

  switch (action) {
    case "added":
      log.info(
        `➕ ${account.type} ${account.login} added ${pluralize(
          "repository",
          added.length,
          true,
        )}`,
      );

      try {
        await processAddInstallationRepositories({
          app,
          context,
        });
      } catch (err) {
        log.error(err, `❌ Failed to add or schedule some repositories, triggering full installation setup`);
        setUpInstallation({
          app,
          context,
        })
      }
      break;
    case "removed":
      log.info(
        `➖ ${account.type} ${account.login} removed ${pluralize(
          "repository",
          removed.length,
          true,
        )}`,
      );

      try {
        await processRemoveInstallationRepositories({
          app,
          context,
        });
      } catch (err) {
        log.error(err, `❌ Failed to remove or unschedule some repositories, triggering full installation setup`);
        setUpInstallation({
          app,
          context,
        })
      }
      break;
    default:
      log.warn(
        `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
      );
      break;
  }
}

export default handleInstallationRepositories;