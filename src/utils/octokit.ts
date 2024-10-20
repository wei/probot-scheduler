import { ProbotOctokit } from "probot";
import { createAppAuth } from "@octokit/auth-app";
import { appConfig } from "@src/utils/config.ts";

export function getProbotOctokit() {
  const { appId, privateKey, baseUrl } = appConfig;

  return new ProbotOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      baseUrl,
    },
  });
}