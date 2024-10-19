import { ProbotOctokit } from "probot";
import { readEnvOptions } from "probot/lib/bin/read-env-options.js";
import { createAppAuth } from "@octokit/auth-app";

export function getProbotOctokit() {
  const {
    appId,
    privateKey,
    baseUrl,
  } = readEnvOptions(Deno.env.toObject());

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
