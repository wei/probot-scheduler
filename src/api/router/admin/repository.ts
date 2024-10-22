import type { Request, Response } from "express";
import type { Probot } from "probot";
import type { InstallationService } from "@src/services/installation-service.ts";

const repositoryRouteHandlers = (
  app: Probot,
  installationService: InstallationService,
) => {
  return {
    adminGetRepository: async (req: Request, res: Response) => {
      const { owner, repo } = req.params;
      const fullName = `${owner}/${repo}`;

      try {
        const repository = await installationService.getRepository(
          { fullName },
        );
        if (repository) {
          res.json(repository);
        } else {
          res.status(404).json({ error: "Repository not found" });
        }
      } catch (error) {
        app.log.error({
          repositoryName: fullName,
          err: error,
        }, `Error fetching repository details for ${fullName}:`);
        const errorMessage = error instanceof Error
          ? error.message
          : "Internal server error";
        const statusCode = errorMessage.includes("not found") ? 404 : 500;
        return res.status(statusCode).json({ error: errorMessage });
      }
    },
    adminProcessRepository: async (req: Request, res: Response) => {
      const { owner, repo } = req.params;
      const fullName = `${owner}/${repo}`;

      try {
        await installationService.processRepository({ fullName }, true);
        res.status(202).json({
          message: `Job scheduled for repository: ${fullName}`,
        });
      } catch (error) {
        app.log.error({
          repositoryName: fullName,
          err: error,
        }, `Error scheduling job for repository ${fullName}:`);
        const errorMessage = error instanceof Error
          ? error.message
          : "Internal server error";
        const statusCode = errorMessage.includes("not found") ? 404 : 500;
        return res.status(statusCode).json({ error: errorMessage });
      }
    },
  };
};

export default repositoryRouteHandlers;
