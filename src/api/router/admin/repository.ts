import {
  createError,
  defineEventHandler,
  getRouterParams,
  type H3Event,
  setResponseStatus,
} from "h3";
import type { Probot } from "probot";
import type { InstallationService } from "@src/services/installation-service.ts";

const repositoryRouteHandlers = (
  app: Probot,
  installationService: InstallationService,
) => ({
  adminGetRepository: defineEventHandler(async (event: H3Event) => {
    const { owner, repo } = getRouterParams(event);
    const fullName = `${owner}/${repo}`;

    try {
      const repository = await installationService.getRepository(
        { fullName },
      );
      if (repository) {
        return repository;
      } else {
        throw createError({
          statusCode: 404,
          statusMessage: "Repository not found",
        });
      }
    } catch (error) {
      app.log.error({
        repositoryName: fullName,
        err: error,
      }, `Error fetching repository details for ${fullName}:`);
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      throw createError({
        statusCode: errorMessage.includes("not found") ? 404 : 500,
        statusMessage: errorMessage,
      });
    }
  }),
  adminProcessRepository: defineEventHandler(async (event: H3Event) => {
    const { owner, repo } = getRouterParams(event);
    const fullName = `${owner}/${repo}`;

    try {
      await installationService.processRepository({ fullName }, true);

      setResponseStatus(event, 202);
      return {
        message: `Job scheduled for repository: ${fullName}`,
      };
    } catch (error) {
      app.log.error({
        repositoryName: fullName,
        err: error,
      }, `Error scheduling job for repository ${fullName}:`);
      const errorMessage = error instanceof Error
        ? error.message
        : "Internal server error";
      throw createError({
        statusCode: errorMessage.includes("not found") ? 404 : 500,
        statusMessage: errorMessage,
      });
    }
  }),
});

export default repositoryRouteHandlers;
