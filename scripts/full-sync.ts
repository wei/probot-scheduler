import log from "@src/utils/logger.ts";
import { connectMongoDB, disconnectMongoDB } from "@src/configs/database.ts";
import { fullSync } from "@src/utils/full-sync.ts";
import { createProbot } from "probot";

async function main() {
  let exitCode = 0;

  try {
    await connectMongoDB();

    const probot = createProbot({ overrides: { log } });
    await fullSync(probot);
  } catch (error) {
    log.error(error, "Error during full sync");
    exitCode = 1;
  } finally {
    await disconnectMongoDB();
    Deno.exit(exitCode);
  }
}

if (import.meta.main) {
  await main();
}
