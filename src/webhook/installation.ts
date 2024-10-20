import type { Context, Probot } from "probot";
import pluralize from "@wei/pluralize";
import { appConfig } from "@src/utils/config.ts";
import {
  deleteInstallation,
  setUpInstallation,
  suspendInstallation,
} from "@src/processors/installation.ts";

async function handleInstallation(
  app: Probot,
  context: Context<"installation">,
) {
  const {
    action,
    repositories,
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
    case "created":
      log.info(
        {
          repositoryCount: repositories?.length,
          repositoryIds: repositories?.map((repo) => repo.id),
          repositoryNames: repositories?.map((repo) => repo.full_name),
        },
        `🎉 ${account.type} ${account.login} installed on ${
          pluralize("repository", repositories?.length, true)
        }`,
      );
      await setUpInstallation({ app, context });
      break;
    case "deleted":
      log.info(`😭 ${account.type} ${account.login} uninstalled`);

      await deleteInstallation({
        app,
        context,
      });
      break;
    case "new_permissions_accepted":
      log.info(`🔐 ${account.type} ${account.login} accepted new permissions`);

      await setUpInstallation({ app, context });
      break;
    case "suspend":
      log.info(`🚫 ${account.type} ${account.login} suspended`);

      await suspendInstallation({ app, context });
      break;
    case "unsuspend":
      log.info(`👍 ${account.type} ${account.login} unsuspended`);

      await setUpInstallation({
        app,
        context,
      });
      break;
    default:
      log.warn(
        `⚠️ Unhandled event ${context.name}.${action} by ${account.login}`,
      );
      break;
  }
}

export default handleInstallation;
