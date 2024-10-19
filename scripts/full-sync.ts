import "@std/dotenv/load";
import mongoose from "mongoose";
import { createProbot } from "probot";
import { getProbotOctokit } from "@/lib/helpers.ts";
import { processInstallation } from "@/lib/processors/installation.ts";

let exitCode = 0;

try {
  await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
  console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);

  const octokit = getProbotOctokit();
  const installationIds = await octokit.paginate(
    octokit.apps.listInstallations,
    { per_page: 100 },
    (response) => response.data.map((installation) => installation.id),
  );

  const app = createProbot();
  for (const installationId of installationIds) {
    await processInstallation({ app, installationId });
  }
} catch (error) {
  console.error("Error:", error);
  exitCode = 1;
} finally {
  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
  Deno.exit(exitCode);
}
