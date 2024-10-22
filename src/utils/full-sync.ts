import type { Probot } from "probot";
import { getProbotOctokit } from "./octokit.ts";
import { createInstallationService } from "@src/services/service-factory.ts";
import type { InstallationSchemaType } from "@src/models/installation-model.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";

export async function fullSync(app: Probot, options: SchedulerAppOptions) {
  const octokit = getProbotOctokit();
  const installationService = createInstallationService(app, options);

  const log = app.log.child({
    service: "FullSync",
  });

  log.info("🔄 Starting full sync");

  try {
    const installations = await octokit.paginate(
      octokit.apps.listInstallations,
      { per_page: 100 },
    ) as InstallationSchemaType[];

    log.info(`📊 Found ${installations.length} installations`);

    for (const installation of installations) {
      try {
        await installationService.processInstallation(installation.id, {
          triggerImmediately: false,
        });
        log.info(
          { installationId: installation.id },
          `✅ Processed installation`,
        );
      } catch (error) {
        log.error(
          { err: error, installationId: installation.id },
          `❌ Failed to process installation`,
        );
      }
    }

    log.info("✅ Full sync completed successfully");
  } catch (error) {
    log.error({ err: error }, "❌ Full sync failed");
    throw error;
  }
}
