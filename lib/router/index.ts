import express from "express";
import type { Request, Response } from "express";
import type { Probot } from "probot";
import adminInstallationRouteHandlers from "@/lib/router/admin-installation.ts";

const createRouter = (app: Probot) => {
  const router = express.Router();

  const {
    get: getAdminInstallation,
    post: postAdminInstallation,
  } = adminInstallationRouteHandlers(app);
  router.get(
    "/api/admin/installation/:installationIdOrLogin",
    getAdminInstallation,
  );
  router.post(
    "/api/admin/installation/:installationIdOrLogin",
    postAdminInstallation,
  );

  router.get("/status", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return router;
};

export default createRouter;
