import type { Probot } from "probot";
import { createInstallationService } from "@src/services/service-factory.ts";

export const getInstallationHandler = async (
  app: Probot,
  installationIdOrLogin: string,
) => {
  const installationService = createInstallationService(app);
  const log = app.log.child({
    handler: "getInstallationHandler",
    installationIdOrLogin,
  });

  log.debug("Retrieving installation");

  const isNumeric = /^\d+$/.test(installationIdOrLogin);

  const response =
    await (isNumeric
      ? installationService.getInstallation(parseInt(installationIdOrLogin, 10))
      : installationService.getInstallationByLogin(installationIdOrLogin));

  log.debug("Successfully retrieved installation");
  return response;
};

export const processInstallationHandler = async (
  app: Probot,
  installationIdOrLogin: string,
) => {
  const installationService = createInstallationService(app);
  const log = app.log.child({
    handler: "processInstallationHandler",
    installationIdOrLogin,
  });

  log.debug("Processing installation");

  const isNumeric = /^\d+$/.test(installationIdOrLogin);

  const response = await (isNumeric
    ? installationService.processInstallation(
      parseInt(installationIdOrLogin, 10),
      { triggerImmediately: true },
    )
    : installationService.processInstallationByLogin(installationIdOrLogin));

  log.info("Successfully processed installation");
  return response;
};
