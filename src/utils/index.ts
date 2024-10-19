import process from "node:process";
import { ProbotOctokit } from "probot";
import { readEnvOptions } from "probot/lib/bin/read-env-options.js";
import { createAppAuth } from "@octokit/auth-app";

function getAppConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...readEnvOptions(env),
    name: env.APP_NAME || "probot-scheduler",
    mongoDBUrl: env.MONGODB_URL,
  };
}

export const appConfig = getAppConfig();

export function getProbotOctokit() {
  const {
    appId,
    privateKey,
    baseUrl,
  } = getAppConfig();

  const octokit = new ProbotOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      baseUrl,
    },
  });

  return octokit;
}
