import type { Probot } from "probot";
import { Redis } from "ioredis";
import { appConfig } from "@src/configs/app-config.ts";
import { InstallationService } from "@src/services/installation-service.ts";
import { SchedulingService } from "./scheduling-service.ts";
import { DataService } from "./data-service.ts";
import { InstallationRepositoryService } from "@src/services/installation-repository-service.ts";

export function createInstallationService(app: Probot): InstallationService {
  const redisClient = new Redis(appConfig.redisConfig!, {
    maxRetriesPerRequest: null,
  });
  const jobSchedulingService = new SchedulingService(
    redisClient,
    app.log,
  );
  const dataService = new DataService(app.log);
  return new InstallationService(
    app,
    dataService,
    jobSchedulingService,
  );
}

export function createInstallationRepositoryService(
  app: Probot,
): InstallationRepositoryService {
  const redisClient = new Redis(appConfig.redisConfig!, {
    maxRetriesPerRequest: null,
  });
  const jobSchedulingService = new SchedulingService(
    redisClient,
    app.log,
  );
  const dataService = new DataService(app.log);
  return new InstallationRepositoryService(
    app,
    dataService,
    jobSchedulingService,
  );
}
