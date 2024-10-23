import type { Request, Response } from "express";
import type { Probot } from "probot";
import express from "express";
import { createInstallationService } from "@src/services/service-factory.ts";
import createAdminRouter from "./admin/index.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";

const createRouter = (app: Probot, options: SchedulerAppOptions) => {
  const router = express.Router();
  const installationService = createInstallationService(app, options);

  // Mount admin router
  router.use("/api/admin", createAdminRouter(app, installationService));

  // Status route
  router.get("/ping", (_req: Request, res: Response) => {
    res.json({ status: "pong" });
  });

  return router;
};

export default createRouter;
