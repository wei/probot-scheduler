import "@std/dotenv/load";
import express from "express";
import { createNodeMiddleware, createProbot } from "probot";
import createSchedulerApp from "../../index.ts";
import { appConfig } from "@src/utils/index.ts";
import { connectMongoDB, disconnectMongoDB } from "@src/db/index.ts";
import createRouter from "./router/index.ts";
import process from "node:process";

const args = Deno.args;
const skipFullSync = args.includes("--skip-full-sync");

await connectMongoDB();

const probot = createProbot();
const schedulerApp = createSchedulerApp.bind(null, probot, { skipFullSync });

const server = express();
server.use(createNodeMiddleware(schedulerApp, {
  probot,
  webhooksPath: appConfig.webhookPath || "/api/github/webhooks",
}));
server.use("/", createRouter(probot));

server.listen(appConfig.port, () => {
  console.info(
    `[Express] Server is running on port ${appConfig.port}`,
  );
});

// Handle app termination
process.on("SIGINT", async () => {
  await disconnectMongoDB();
  console.info("[MongoDB] Connection closed due to app termination");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectMongoDB();
  console.info("[MongoDB] Connection closed due to app termination");
  process.exit(0);
});
