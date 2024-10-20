import type { Context, Probot } from "probot";
import pluralize from "@wei/pluralize";
import { appConfig } from "@src/utils/config.ts";
import {
  processAddInstallationRepositories,
  processRemoveInstallationRepositories,
} from "@src/processors/installation-repositories.ts";
import { setUpInstallation } from "@src/processors/installation.ts";

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

  const log = context.log = context.log.child({
    name: appConfig.name,
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
        {
          repositoryCount: added.length,
          repositoryIds: added.map((repo) => repo.id),
          repositoryNames: added.map((repo) => repo.full_name),
        },
        `➕ ${account.type} ${account.login} added ${
          pluralize("repository", added.length, true)
        }`,
      );

      try {
        await processAddInstallationRepositories({ context });
        log.debug(
          `✅ Successfully processed ${context.name}.${action} for ${account.login}`,
        );
      } catch (err) {
        log.error(
          err,
          `❌ Failed to add or schedule some repositories, triggering full installation setup`,
        );
        await setUpInstallation({ app, context });
      }
      break;
    case "removed":
      log.info(
        {
          repositoryCount: removed.length,
          repositoryIds: removed.map((repo) => repo.id),
          repositoryNames: removed.map((repo) => repo.full_name),
        },
        `➖ ${account.type} ${account.login} removed ${
          pluralize("repository", removed.length, true)
        }`,
      );

      try {
        await processRemoveInstallationRepositories({ context });
        log.debug(
          `✅ Successfully processed ${context.name}.${action} for ${account.login}`,
        );
      } catch (err) {
        log.error(
          err,
          `❌ Failed to remove or unschedule some repositories, triggering full installation setup`,
        );
        await setUpInstallation({ app, context });
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
