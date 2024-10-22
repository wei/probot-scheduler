import { createRouter, defineEventHandler, type H3Event, useBase } from "h3";
import type { Probot } from "probot";
import { createInstallationService } from "@src/services/service-factory.ts";
import createAdminRouter from "./admin/index.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";

const createAppRouter = (app: Probot, options: SchedulerAppOptions) => {
  const router = createRouter();
  const installationService = createInstallationService(app, options);

  // Mount admin api router
  router.use(
    "/api/admin/**",
    useBase("/api/admin", createAdminRouter(app, installationService).handler),
  );

  // Status route
  router.get(
    "/ping",
    defineEventHandler((_event: H3Event) => {
      return { status: "pong" };
    }),
  );

  return router;
};

export default createAppRouter;
