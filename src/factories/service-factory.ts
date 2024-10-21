import type { Probot } from "probot";
import { Redis } from "ioredis";
import { appConfig } from "@src/config/app-config.ts";
import { InstallationService } from "@src/services/installation-service.ts";
import { RepositoryJobSchedulingService } from "@src/queue/scheduling-service.ts";
import { InstallationDataService } from "@src/data-services/installation-data-service.ts";
import { InstallationRepositoryService } from "@src/services/installation-repository-service.ts";

export function createInstallationService(app: Probot): InstallationService {
  const redisClient = new Redis(appConfig.redisConfig!, {
    maxRetriesPerRequest: null,
  });
  const repositoryJobSchedulingService = new RepositoryJobSchedulingService(
    redisClient,
    app.log,
  );
  const installationDataService = new InstallationDataService(app.log);
  return new InstallationService(
    app,
    installationDataService,
    repositoryJobSchedulingService,
  );
}

export function createInstallationRepositoryService(
  app: Probot,
): InstallationRepositoryService {
  const redisClient = new Redis(appConfig.redisConfig!, {
    maxRetriesPerRequest: null,
  });
  const repositoryJobSchedulingService = new RepositoryJobSchedulingService(
    redisClient,
    app.log,
  );
  const installationDataService = new InstallationDataService(app.log);
  return new InstallationRepositoryService(
    app,
    installationDataService,
    repositoryJobSchedulingService,
  );
}
