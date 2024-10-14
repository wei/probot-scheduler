import { model, Schema } from "mongoose";
import type { Context } from "probot";

const InstallationSchema = new Schema<
  | Context<"installation">["payload"]["installation"]
  | Context<"installation.suspend">["payload"]["installation"]
>({
  id: {
    type: Number,
    unique: true,
  },
  account: {
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
});

export default model<
  | Context<"installation">["payload"]["installation"]
  | Context<"installation.suspend">["payload"]["installation"]
>("Installation", InstallationSchema);
