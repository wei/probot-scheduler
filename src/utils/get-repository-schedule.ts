import type {
  RepositoryMetadataSchemaType,
  RepositorySchemaType,
} from "@src/models/index.ts";
import { JobPriority } from "@src/utils/types.ts";

export async function getExampleRepositorySchedule(
  repository: RepositorySchemaType,
  _currentMetadata?: RepositoryMetadataSchemaType,
) {
  // Simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  const metadata: RepositoryMetadataSchemaType = {
    repository_id: repository.id,
    cron: "*/2 * * * *",
    job_priority: JobPriority.Normal,
  };

  return metadata;
}
