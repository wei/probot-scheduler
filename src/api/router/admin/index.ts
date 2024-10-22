import { createRouter } from "h3";
import type { Probot } from "probot";
import type { InstallationService } from "@src/services/installation-service.ts";
import installationRouteHandlers from "./installation.ts";
import repositoryRouteHandlers from "./repository.ts";

const createAdminRouter = (
  app: Probot,
  installationService: InstallationService,
) => {
  const adminRouter = createRouter();

  const {
    adminGetInstallation,
    adminProcessInstallation,
  } = installationRouteHandlers(app, installationService);

  const {
    adminGetRepository,
    adminProcessRepository,
  } = repositoryRouteHandlers(app, installationService);

  // Admin installation routes
  adminRouter.get("/installation/:installationIdOrLogin", adminGetInstallation);
  adminRouter.get(
    "/installation/:installationIdOrLogin/process",
    adminProcessInstallation,
  );

  // Admin repository routes
  adminRouter.get("/repository/:owner/:repo", adminGetRepository);
  adminRouter.get("/repository/:owner/:repo/process", adminProcessRepository);

  return adminRouter;
};

export default createAdminRouter;
