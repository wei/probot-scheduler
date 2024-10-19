import type { Context, Probot } from "probot";
import pluralize from "pluralize";
import { appConfig } from "@/lib/helpers.ts";
import {
  deleteInstallation,
  setUpInstallation,
  suspendInstallation,
} from "@/lib/processors/installation.ts";

function handleInstallation(
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

  const log = context.log.child({
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
        `🤗 ${account.type} ${account.login} installed on ${
          pluralize(
            "repository",
            repositories?.length,
            true,
          )
        }`,
      );

      setUpInstallation({
        app,
        context,
      });
      break;
    case "deleted":
      log.info(`😭 ${account.type} ${account.login} uninstalled`);

      deleteInstallation({
        app,
        context,
      });
      break;
    case "new_permissions_accepted":
      log.info(`👌 ${account.type} ${account.login} accepted new permissions`);

      setUpInstallation({
        app,
        context,
      });
      break;
    case "suspend":
      log.info(`🚫 ${account.type} ${account.login} suspended`);

      suspendInstallation({
        app,
        context,
      });
      break;
    case "unsuspend":
      log.info(`👍 ${account.type} ${account.login} unsuspended`);

      setUpInstallation({
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
