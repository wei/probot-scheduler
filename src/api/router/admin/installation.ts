import {
  defineEventHandler,
  getRouterParam,
  type H3Event,
  setResponseStatus,
} from "h3";
import type { Probot } from "probot";
import type { InstallationService } from "@src/services/installation-service.ts";

const installationRouteHandlers = (
  app: Probot,
  installationService: InstallationService,
) => ({
  adminGetInstallation: defineEventHandler(async (event: H3Event) => {
    const installationIdOrLogin = getRouterParam(
      event,
      "installationIdOrLogin",
    ) ?? "";

    try {
      const response = await installationService.getInstallationByLoginOrId(
        installationIdOrLogin,
      );
      return response;
    } catch (error) {
      app.log.error({
        installationIdOrLogin,
        err: error,
      }, "Failed to retrieve installation");
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      event.node.res.statusCode = errorMessage.includes("not found")
        ? 404
        : 500;
      return { error: errorMessage };
    }
  }),
  adminProcessInstallation: defineEventHandler(async (event: H3Event) => {
    const installationIdOrLogin = getRouterParam(
      event,
      "installationIdOrLogin",
    ) ?? "";
    try {
      await installationService.processInstallationByLoginOrId(
        installationIdOrLogin,
        { triggerImmediately: true },
      );

      setResponseStatus(event, 202);
      return {
        message: `Job scheduled for installation: ${installationIdOrLogin}`,
      };
    } catch (error) {
      app.log.error({
        installationIdOrLogin,
        err: error,
      }, "Failed to process installation");
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      event.node.res.statusCode = errorMessage.includes("not found")
        ? 404
        : 500;
      return { error: errorMessage };
    }
  }),
});

export default installationRouteHandlers;
