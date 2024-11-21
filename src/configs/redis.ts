import { Redis } from "ioredis";
import { appConfig } from "@src/configs/app-config.ts";

export const getRedisClient = (name?: string) => {
  const redisClient = new Redis(appConfig.redisConfig!, {
    maxRetriesPerRequest: null,
    name,
  });
  return redisClient;
};
