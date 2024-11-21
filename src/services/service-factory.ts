import type { Probot } from "probot";
import type { SchedulerAppOptions } from "@src/utils/types.ts";
import { getRedisClient } from "@src/configs/redis.ts";
import { InstallationService } from "@src/services/installation-service.ts";
import { SchedulingService } from "./scheduling-service.ts";
import { DataService } from "./data-service.ts";

export function createInstallationService(
  app: Probot,
  options: SchedulerAppOptions | null,
): InstallationService {
  const redisClient = options?.redisClient ??
    getRedisClient();
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
