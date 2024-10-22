import express from "express";
import { createNodeMiddleware, createProbot } from "probot";
import createSchedulerApp from "@src/app.ts";
import { connectMongoDB, disconnectMongoDB } from "@src/configs/database.ts";
import createRouter from "./router/index.ts";
import log from "@src/utils/logger.ts";
import { appConfig } from "@src/configs/app-config.ts";
import { getExampleRepositorySchedule } from "@src/utils/get-repository-schedule.ts";

const args = Deno.args;
const skipFullSync = args.includes("--skip-full-sync");

await connectMongoDB();

const probot = createProbot({
  overrides: {
    log,
  },
});
const schedulerApp = createSchedulerApp.bind(null, probot, {
  skipFullSync,
  getRepositorySchedule: getExampleRepositorySchedule,
});

const server = express();
server.use(createNodeMiddleware(schedulerApp, {
  probot,
  webhooksPath: appConfig.webhookPath || "/api/github/webhooks",
}));
server.use(
  "/",
  createRouter(probot, {
    getRepositorySchedule: getExampleRepositorySchedule,
  }),
);

server.listen(appConfig.port, () => {
  log.info(`[Express] Server is running on port ${appConfig.port}`);
});

const handleAppTermination = async (signal: string) => {
  log.info(`[${signal}] Signal received: closing MongoDB connection`);
  await disconnectMongoDB();
  log.info("[MongoDB] Connection closed due to app termination");
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", () => handleAppTermination("SIGINT"));
Deno.addSignalListener("SIGTERM", () => handleAppTermination("SIGTERM"));
