import type { Probot } from "probot";
import Installation from "@/models/Installation.ts";
import { getInstallation, processInstallation } from "./installation.ts";

export async function processInstallationByLogin({
  app,
  installationLogin,
}: {
  app: Probot;
  installationLogin: string;
}) {
  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    app.log.warn(`Installation not found: ${installationLogin}`);
    return new Error(`Installation not found: ${installationLogin}`);
  }

  return processInstallation({
    app,
    installationId: installation.id,
  });
}

export async function getInstallationByLogin({
  app,
  installationLogin,
}: {
  app: Probot;
  installationLogin: string;
}) {
  const installation = await Installation.findOne({
    "account.login": installationLogin,
  }, { id: 1, _id: 0 }).lean();

  if (!installation) {
    app.log.warn(`Installation not found: ${installationLogin}`);
    throw new Error(`Installation not found: ${installationLogin}`);
  }

  return getInstallation({
    app,
    installationId: installation.id,
  });
}
