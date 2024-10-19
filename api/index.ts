import "@std/dotenv/load";
import express from "express";
import mongoose from "mongoose";
import { createNodeMiddleware, createProbot } from "probot";
import createSchedulerApp from "@/index.ts";
import createRouter from "./router/index.ts";

const args = Deno.args;
const skipFullSync = args.includes("--skip-full-sync");

await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
console.info(`[MongoDB] Connection state: ${mongoose.connection.readyState}`);

const probot = createProbot();
const schedulerApp = createSchedulerApp.bind(null, probot, { skipFullSync });

const server = express();
server.use(createNodeMiddleware(schedulerApp, {
  probot,
  webhooksPath: Deno.env.get("WEBHOOK_PATH") || "/api/github/webhooks",
}));
server.use("/", createRouter(probot));

server.listen(Deno.env.get("PORT") || 3000, () => {
  console.info(
    `[Express] Server is running on port ${Deno.env.get("PORT") || 3000}`,
  );
});
