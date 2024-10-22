import type { Request, Response } from "express";
import type { Probot } from "probot";
import express from "express";
import { createInstallationService } from "@src/services/service-factory.ts";
import createAdminRouter from "./admin/index.ts";

const createRouter = (app: Probot) => {
  const router = express.Router();
  const installationService = createInstallationService(app);

  // Mount admin router
  router.use("/api/admin", createAdminRouter(app, installationService));

  // Status route
  router.get("/ping", (_req: Request, res: Response) => {
    res.json({ status: "pong" });
  });

  return router;
};

export default createRouter;
