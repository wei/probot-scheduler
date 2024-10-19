import "@std/dotenv/load";
import express from "express";
import mongoose from "mongoose";
import { createNodeMiddleware, createProbot } from "probot";
import probotApp from "@/lib/app.ts";
import createRouter from "@/lib/router/index.ts";

const args = Deno.args;
const skipFullSync = args.includes("--skip-full-sync");

if (skipFullSync) {
  console.info("Skipping full sync.");
} else {
  await fullSync();
}

const probot = createProbot();

const server = express();
server.use(createNodeMiddleware(probotApp, { probot }));
server.use("/", createRouter(probot));

await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
console.info(`[MongoDB] Connection state: ${mongoose.connection.readyState}`);

server.listen(Deno.env.get("PORT") || 3000, () => {
  console.info(
    `[Express] Server is running on port ${Deno.env.get("PORT") || 3000}`,
  );
});

async function fullSync() {
  console.info("[Full Sync] Starting...");
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "task",
      "full-sync",
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();

  // open a file and pipe the subprocess output to it.
  child.stdout.pipeTo(
    Deno.openSync("./logs/full-sync.stdout.log", { write: true, create: true })
      .writable,
  );
  child.stderr.pipeTo(
    Deno.openSync("./logs/full-sync.stderr.log", { write: true, create: true })
      .writable,
  );

  const status = await child.status;
  if (status.success) {
    console.info("[Full Sync] Successful.");
  } else {
    console.error(
      "[Full Sync] Failed, check logs for more information.",
    );
    Deno.exit(1);
  }
}
