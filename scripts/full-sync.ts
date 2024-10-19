import "@std/dotenv/load";
import mongoose from "mongoose";
import { createProbot, type Probot } from "probot";
import { getProbotOctokit } from "@/lib/helpers.ts";
import { processInstallation } from "@/lib/processors/installation.ts";

async function fullSync(app: Probot = createProbot()) {
  const octokit = getProbotOctokit();

  app.log.info("[Full Sync] Starting...");

  const installationIds = await octokit.paginate(
    octokit.apps.listInstallations,
    { per_page: 100 },
    (response) => response.data.map((installation) => installation.id),
  );

  for (const installationId of installationIds) {
    await processInstallation({ app, installationId });
  }

  app.log.info("[Full Sync] Successful.");
}

export default fullSync;

async function main() {
  let exitCode = 0;

  try {
    await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
    console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);

    await fullSync();
  } catch (error) {
    console.error("Error:", error);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
    Deno.exit(exitCode);
  }
}

if (import.meta.main) {
  await main();
}
