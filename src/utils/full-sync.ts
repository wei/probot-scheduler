import type { Probot } from "probot";
import { getProbotOctokit } from "./octokit.ts";
import { processInstallation } from "@src/processors/installation.ts";

export async function fullSync(app: Probot) {
  const octokit = getProbotOctokit();

  app.log.info("🔄 Starting full sync");

  const installationIds = await octokit.paginate(
    octokit.apps.listInstallations,
    { per_page: 100 },
    (response) => response.data.map((installation) => installation.id),
  );

  for (const installationId of installationIds) {
    await processInstallation({ app, installationId });
  }

  app.log.info("✅ Full sync completed successfully");
}
