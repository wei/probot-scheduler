import type { Probot } from "probot";
import type { Request, Response } from "express";
import {
  getInstallation,
  getInstallationByLogin,
  processInstallation,
  processInstallationByLogin,
} from "@/lib/common/process-installation.ts";

const adminInstallationRouteHandlers = (app: Probot) => {
  async function get(req: Request, res: Response) {
    try {
      const installationIdOrLogin: string = req.params.installationIdOrLogin;
      const isNumeric = /^\d+$/.test(installationIdOrLogin);
      const response = await (isNumeric
        ? getInstallation({
          app,
          installationId: parseInt(installationIdOrLogin, 10),
        })
        : getInstallationByLogin({
          app,
          installationLogin: installationIdOrLogin,
        }));
      return res.json(response);
    } catch (error) {
      app.log.error(error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      const statusCode = errorMessage.match(/not found/i) ? 404 : 400;
      return res.status(statusCode).json({ error: errorMessage });
    }
  }
  async function post(req: Request, res: Response) {
    try {
      const installationIdOrLogin: string = req.params.installationIdOrLogin;
      const isNumeric = /^\d+$/.test(installationIdOrLogin);
      await (isNumeric
        ? processInstallation({
          app,
          installationId: parseInt(installationIdOrLogin, 10),
        })
        : processInstallationByLogin({
          app,
          installationLogin: installationIdOrLogin,
        }));
      return get(req, res);
    } catch (error) {
      app.log.error(error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      const statusCode = errorMessage.match(/not found/i) ? 404 : 400;
      return res.status(statusCode).json({ error: errorMessage });
    }
  }
  return {
    get,
    post,
  };
};
export default adminInstallationRouteHandlers;
