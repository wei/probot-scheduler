import type { Request, Response } from "express";
import type { Probot } from "probot";
import { createInstallationService } from "@src/services/service-factory.ts";

const installationRouteHandlers = (app: Probot) => {
  return {
    adminGetInstallation: async (req: Request, res: Response) => {
      try {
        const installationService = createInstallationService(app);
        const response = await installationService.getInstallation(
          req.params.installationIdOrLogin,
        );
        return res.json(response);
      } catch (error) {
        app.log.error({
          installationIdOrLogin: req.params.installationIdOrLogin,
          err: error,
        }, "Failed to retrieve installation");
        const errorMessage = error instanceof Error
          ? error.message
          : "Internal server error";
        const statusCode = errorMessage.includes("not found") ? 404 : 500;
        return res.status(statusCode).json({ error: errorMessage });
      }
    },
    adminProcessInstallation: async (req: Request, res: Response) => {
      try {
        const installationService = createInstallationService(app);
        const response = await installationService.processInstallation(
          req.params.installationIdOrLogin,
        );
        return res.json(response);
      } catch (error) {
        app.log.error({
          installationIdOrLogin: req.params.installationIdOrLogin,
          err: error,
        }, "Failed to process installation");
        const errorMessage = error instanceof Error
          ? error.message
          : "Internal server error";
        const statusCode = errorMessage.includes("not found") ? 404 : 500;
        return res.status(statusCode).json({ error: errorMessage });
      }
    },
  };
};

export default installationRouteHandlers;
