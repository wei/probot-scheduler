import type { Logger, Probot } from "probot";
import pLimit from "p-limit";
import type { InstallationSchemaType } from "@src/models/index.ts";
import type { SchedulerAppOptions } from "@src/utils/types.ts";
import type { InstallationService } from "@src/services/installation-service.ts";
import { getProbotOctokit } from "@src/utils/octokit.ts";
import { createInstallationService } from "@src/services/service-factory.ts";

export async function fullSync(
  app: Probot,
  options: SchedulerAppOptions | null,
) {
  const octokit = getProbotOctokit();
  const installationService = createInstallationService(app, options);

  const limit = pLimit(15);

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

    await Promise.all(
      installations.map((installation) =>
        limit(() => processInstallation(installationService, installation, log))
      ),
    );

    log.info("✅ Full sync completed successfully");
  } catch (error) {
    log.error({ err: error }, "❌ Full sync failed");
    throw error;
  }
}

async function processInstallation(
  installationService: InstallationService,
  installation: InstallationSchemaType,
  log: Logger,
) {
  try {
    log.info(
      { installationId: installation.id, owner: installation.account.login },
      `🔄 Processing installation`,
    );
    await installationService.processInstallation(installation.id, {
      triggerImmediately: false,
    });
    log.debug(
      { installationId: installation.id, owner: installation.account.login },
      `✅ Processed installation`,
    );
  } catch (error) {
    log.error(
      {
        err: error,
        installationId: installation.id,
        owner: installation.account.login,
      },
      `❌ Failed to process installation`,
    );
  }
}
