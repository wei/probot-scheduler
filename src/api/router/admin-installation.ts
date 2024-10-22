import type { Probot } from "probot";
import type { Request, Response } from "express";
import {
  getInstallationHandler,
  processInstallationHandler,
} from "@src/handlers/api-handlers.ts";

const adminInstallationRouteHandlers = (app: Probot) => {
  async function get(req: Request, res: Response) {
    try {
      const response = await getInstallationHandler(
        app,
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
  }

  async function post(req: Request, res: Response) {
    try {
      const response = await processInstallationHandler(
        app,
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
  }

  return {
    get,
    post,
  };
};

export default adminInstallationRouteHandlers;
