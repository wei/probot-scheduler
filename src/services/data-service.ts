import {
  InstallationModel,
  type InstallationSchemaType,
} from "@src/models/installation-model.ts";
import {
  RepositoryModel,
  type RepositorySchemaType,
} from "@src/models/repository-model.ts";
import pluralize from "@wei/pluralize";
import type { AnyBulkWriteOperation } from "mongoose";
import type { Logger } from "pino";
import { removeUndefinedKeys } from "@src/utils/helpers.ts";
import {
  RepositoryMetadataModel,
  type RepositoryMetadataSchemaType,
} from "@src/models/repository-metadata-model.ts";

export class DataService {
  private log?: Logger;

  constructor(private logger?: Logger) {
    this.log = logger?.child({
      service: "InstallationDataService",
    });
  }

  async saveInstallation(data: InstallationSchemaType) {
    this.log?.debug({
      installationId: data.id,
    }, `💾 Saving installation`);
    return await InstallationModel.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, upsert: true },
    );
  }

  async deleteInstallation(installationId: number) {
    this.log?.debug({
      installationId,
    }, `🗑️ Deleting installation`);
    await InstallationModel.findOneAndDelete({ id: installationId });
    await RepositoryModel.deleteMany({ installation_id: installationId });
  }

  async getInstallation(installationId: number) {
    this.log?.debug({
      installationId,
    }, `📥 Getting installation`);
    const installation = await InstallationModel.findOne({
      id: installationId,
    });
    if (!installation) {
      this.log?.warn({
        installationId,
      }, `🔍 Installation not found`);
      throw new Error(`Installation not found`);
    }
    const repositories = await RepositoryModel.find({
      installation_id: installationId,
    });
    this.log?.debug({
      installationId,
      accountId: installation.account.id,
      accountType: installation.account.type,
      accountName: installation.account.login,
    }, `📦 Found ${pluralize("repository", repositories.length, true)}`);
    return { installation, repositories };
  }

  async updateRepositories(
    installationId: number,
    installedRepositories: RepositorySchemaType[],
  ) {
    this.log?.debug({
      installationId,
      repositoryCount: installedRepositories.length,
      repositoryIds: installedRepositories.map((r) => r.id),
      repositoryNames: installedRepositories.map((r) => r.full_name),
    }, `🔄 Updating repositories`);
    const existingRepositoriesIdSet: Set<number> = new Set(
      (await RepositoryModel.find(
        { installation_id: installationId },
        { id: 1, _id: 0 },
      )).map((r) => r.id),
    );

    const repositoriesToAdd: RepositorySchemaType[] = [];
    const repositoriesToUpdate: RepositorySchemaType[] = [];

    // Determine repositories to add, update, and remove
    for (const repo of installedRepositories) {
      if (existingRepositoriesIdSet.has(repo.id)) {
        repositoriesToUpdate.push(repo);
        existingRepositoriesIdSet.delete(repo.id);
      } else {
        repositoriesToAdd.push(repo);
      }
    }

    const repositoryIdsToRemove = [...existingRepositoriesIdSet];

    // Update MongoDB
    const bulkOps: AnyBulkWriteOperation<RepositorySchemaType>[] = [];

    // Add repositories
    for (const repo of repositoriesToAdd) {
      bulkOps.push({
        insertOne: {
          document: {
            ...repo,
            installation_id: installationId,
          },
        },
      });
    }

    // Remove repositories
    if (repositoryIdsToRemove.length > 0) {
      bulkOps.push({
        deleteMany: {
          filter: {
            id: { $in: repositoryIdsToRemove },
            installation_id: installationId,
          },
        },
      });
    }

    // Update repositories
    for (const repo of repositoriesToUpdate) {
      if (repo) {
        bulkOps.push({
          updateOne: {
            filter: { id: repo.id },
            update: {
              $set: {
                ...repo,
                installation_id: installationId,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      this.log?.debug({
        installationId,
      }, `💾 Updated repositories in MongoDB in bulk`);
      await RepositoryModel.bulkWrite(bulkOps);
    }
  }

  async getRepository({
    installationId,
    repositoryId,
    fullName,
  }: {
    installationId?: number;
    repositoryId?: number;
    fullName?: string;
  }) {
    return await RepositoryModel.findOne(removeUndefinedKeys({
      id: repositoryId,
      installation_id: installationId,
      full_name: fullName,
    }));
  }

  async addRepository(
    installationId: number,
    repository: RepositorySchemaType,
  ) {
    this.log?.debug({
      installationId,
      repositoryId: repository.id,
    }, `➕ Upserting repository`);

    return await RepositoryModel.findOneAndUpdate(
      { id: repository.id, installation_id: installationId },
      { ...repository, installation_id: installationId },
      { new: true, upsert: true },
    );
  }

  async deleteRepository(installationId: number, repositoryId: number) {
    this.log?.debug({
      installationId,
      repositoryId,
    }, `🗑️ Deleting repository`);
    return await RepositoryModel.findOneAndDelete({
      id: repositoryId,
      installation_id: installationId,
    });
  }

  async getInstallationByLogin(login: string) {
    this.log?.debug({
      login,
    }, `🔍 Getting installation by login`);
    return await InstallationModel.findOne({ "account.login": login }, {
      id: 1,
      _id: 0,
    });
  }

  async getRepositoryMetadata(
    repositoryId: number,
  ): Promise<RepositoryMetadataSchemaType | null> {
    return await RepositoryMetadataModel.findOne({
      repository_id: repositoryId,
    });
  }

  async updateRepositoryMetadata(
    metadata: RepositoryMetadataSchemaType,
  ): Promise<RepositoryMetadataSchemaType> {
    return await RepositoryMetadataModel.findOneAndUpdate(
      { repository_id: metadata.repository_id },
      metadata,
      { new: true, upsert: true },
    );
  }
}
