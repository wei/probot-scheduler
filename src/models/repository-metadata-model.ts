import { type Model, model, Schema } from "mongoose";
import { JobPriority } from "@src/utils/types.ts";

export interface RepositoryMetadataSchemaType {
  repository_id: number;
  cron: string;
  job_priority: JobPriority;
}

const RepositoryMetadataSchema = new Schema<RepositoryMetadataSchemaType>({
  repository_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  cron: {
    type: String,
    required: true,
  },
  job_priority: {
    type: Number,
    required: true,
    enum: Object.values(JobPriority),
  },
}, {
  timestamps: true,
});

export const RepositoryMetadataModel: Model<RepositoryMetadataSchemaType> =
  model<RepositoryMetadataSchemaType>(
    "probot-scheduler.repository_metadata",
    RepositoryMetadataSchema,
  );
