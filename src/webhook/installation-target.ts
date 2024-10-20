import type { Context, Probot } from "probot";
import { appConfig } from "@src/utils/config.ts";
import { setUpInstallation } from "@src/processors/installation.ts";

async function handleInstallationTarget(
  app: Probot,
  context: Context<"installation_target">,
) {
  const {
    action,
    installation: { id: installationId },
    account,
    changes: { login: oldLogin },
  } = context.payload;

  const log = context.log = context.log.child({
    name: appConfig.name,
    event: context.name,
    action,
    account: account.id,
    accountType: account.type,
    accountName: account.login,
    installationId,
  });

  switch (action) {
    case "renamed":
      log.info(
        `♻️ ${account.type} ${account.login} renamed from ${oldLogin}`,
      );

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

export default handleInstallationTarget;
