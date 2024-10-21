import "@std/dotenv/load";
import express from "express";
import { createNodeMiddleware, createProbot } from "probot";
import process from "node:process";
import createSchedulerApp from "@src/app.ts";
import { appConfig } from "@src/configs/app-config.ts";
import log from "@src/utils/logger.ts";
import { connectMongoDB, disconnectMongoDB } from "@src/configs/database.ts";
import createRouter from "./router/index.ts";

const args = Deno.args;
const skipFullSync = args.includes("--skip-full-sync");

await connectMongoDB();

const probot = createProbot({
  overrides: {
    log,
  },
});
const schedulerApp = createSchedulerApp.bind(null, probot, { skipFullSync });

const server = express();
server.use(createNodeMiddleware(schedulerApp, {
  probot,
  webhooksPath: appConfig.webhookPath || "/api/github/webhooks",
}));
server.use("/", createRouter(probot));

server.listen(appConfig.port, () => {
  log.info(`[Express] Server is running on port ${appConfig.port}`);
});

const handleAppTermination = async (signal: string) => {
  log.info(`[${signal}] Signal received: closing MongoDB connection`);
  await disconnectMongoDB();
  log.info("[MongoDB] Connection closed due to app termination");
  process.exit(0);
};

process.on("SIGINT", () => handleAppTermination("SIGINT"));
process.on("SIGTERM", () => handleAppTermination("SIGTERM"));
