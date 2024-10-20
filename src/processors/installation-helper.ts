import type { Logger, Probot } from "probot";
import { Installation } from "@src/db/index.ts";
import { getInstallation, processInstallation } from "./installation.ts";

export async function processInstallationByLogin({
  app,
  installationLogin,
  log,
}: {
  app: Probot;
  installationLogin: string;
  log?: Logger;
}) {
  log = log ?? app.log;

  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    log.warn(`Installation not found: ${installationLogin}`);
    return new Error(`Installation not found: ${installationLogin}`);
  }

  return processInstallation({
    app,
    installationId: installation.id,
    log,
  });
}

export async function getInstallationByLogin({
  app,
  installationLogin,
  log,
}: {
  app: Probot;
  installationLogin: string;
  log?: Logger;
}) {
  log = log ?? app.log;

  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    log.warn(`Installation not found: ${installationLogin}`);
    throw new Error(`Installation not found: ${installationLogin}`);
  }

  return getInstallation({
    app,
    installationId: installation.id,
    log,
  });
}
