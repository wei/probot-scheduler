import type { Probot } from "probot";
import { Redis } from "ioredis";
import { appConfig } from "@src/configs/app-config.ts";
import { InstallationService } from "@src/services/installation-service.ts";
import { SchedulingService } from "./scheduling-service.ts";
import { DataService } from "./data-service.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";

export function createInstallationService(
  app: Probot,
  options: SchedulerAppOptions | null,
): InstallationService {
  const redisClient = options?.redisClient ??
    new Redis(appConfig.redisConfig!, {
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
    options,
  );
}
