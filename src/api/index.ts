import {
  createApp as createH3Server,
  fromNodeMiddleware,
  toWebHandler,
} from "h3";
import {
  createNodeMiddleware as createProbotWebhookMiddleware,
  createProbot,
} from "probot";
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

const server = createH3Server();
server.use(fromNodeMiddleware(
  createProbotWebhookMiddleware(schedulerApp, {
    probot,
    webhooksPath: appConfig.webhookPath || "/api/github/webhooks",
  }),
));
server.use(
  "/",
  createRouter(probot, {
    getRepositorySchedule: getExampleRepositorySchedule,
  }).handler,
);

Deno.serve({ port: appConfig.port }, (req) => toWebHandler(server)(req));

Deno.addSignalListener("SIGINT", () => handleAppTermination("SIGINT"));
Deno.addSignalListener("SIGTERM", () => handleAppTermination("SIGTERM"));

function handleAppTermination(signal: string) {
  log.info(`[${signal}] Signal received: closing MongoDB connection`);
  disconnectMongoDB();
  log.info("[MongoDB] Connection closed due to app termination");
  Deno.exit(0);
}
