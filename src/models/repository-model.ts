import { type Model, model, Schema } from "mongoose";
import type { Context } from "probot";

export type RepositorySchemaType =
  & Context<"repository">["payload"]["repository"]
  & {
    installation_id: number;
  };

const RepositorySchema = new Schema<RepositorySchemaType>({
  id: {
    type: Number,
    required: true,
    index: true,
  },
  node_id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  full_name: {
    type: String,
    required: true,
    index: true,
  },
  owner: {
    id: {
      type: Number,
      index: true,
    },
    login: {
      type: String,
      index: true,
    },
    type: {
      type: String,
    },
    avatar_url: {
      type: String,
    },
  },
  description: {
    type: String,
  },
  fork: {
    type: Boolean,
  },
  stargazers_count: {
    type: Number,
  },
  watchers_count: {
    type: Number,
  },
  forks_count: {
    type: Number,
  },
  default_branch: {
    type: String,
  },
  archived: {
    type: Boolean,
  },
  disabled: {
    type: Boolean,
  },
  visibility: {
    type: String,
  },
  size: {
    type: Number,
  },
  private: {
    type: Boolean,
  },
  pushed_at: {
    type: String,
  },
  created_at: {
    type: String,
  },
  updated_at: {
    type: String,
  },
  installation_id: {
    type: Number,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

RepositorySchema.index({ id: 1, installation_id: 1 }, { unique: true });

export const RepositoryModel: Model<RepositorySchemaType> = model<
  RepositorySchemaType
>(
  "probot-scheduler.repository",
  RepositorySchema,
);
