import { model, Schema } from "mongoose";
import type { Context } from "probot";

export type InstallationSchemaType =
  | Context<"installation">["payload"]["installation"]
  | Context<"installation.suspend">["payload"]["installation"];

const InstallationSchema = new Schema<InstallationSchemaType>({
  id: {
    type: Number,
    unique: true,
  },
  account: {
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
  app_id: {
    type: Number,
  },
  app_slug: {
    type: String,
  },
  repository_selection: {
    type: String,
    enum: ["all", "selected"],
  },
  created_at: {
    type: String,
  },
  updated_at: {
    type: String,
  },
  suspended_at: {
    type: String,
  },
  suspended_by: {
    id: {
      type: Number,
    },
    login: {
      type: String,
    },
    type: {
      type: String,
    },
    avatar_url: {
      type: String,
    },
  },
  target_id: {
    type: Number,
  },
  target_type: {
    type: String,
    enum: ["User", "Organization"],
  },
}, {
  timestamps: true,
});

export const InstallationModel = model<InstallationSchemaType>(
  "probot-scheduler.installation",
  InstallationSchema,
);
