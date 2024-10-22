import {
  InstallationModel,
  type InstallationModelSchemaType,
} from "@src/models/installation-model.ts";
import {
  RepositoryModel,
  type RepositoryModelSchemaType,
} from "@src/models/repository-model.ts";
import pluralize from "@wei/pluralize";
import type { AnyBulkWriteOperation } from "mongoose";
import type { Logger } from "pino";
import { removeUndefinedKeys } from "@src/utils/helpers.ts";

export class DataService {
  private log?: Logger;

  constructor(private logger?: Logger) {
    this.log = logger?.child({
      service: "InstallationDataService",
    });
  }

  async saveInstallation(data: InstallationModelSchemaType) {
    this.log?.debug({
      installationId: data.id,
    }, `💾 Saving installation`);
    return await InstallationModel.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, upsert: true },
    ).lean();
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
    const installation = await InstallationModel.findOne({ id: installationId })
      .lean();
    if (!installation) {
      this.log?.warn({
        installationId,
      }, `🔍 Installation not found`);
      throw new Error(`Installation not found`);
    }
    const repositories = await RepositoryModel.find({
      installation_id: installationId,
    }).lean();
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
    installedRepositories: RepositoryModelSchemaType[],
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
      ).lean()).map((r: RepositoryModelSchemaType) => r.id),
    );

    const repositoriesToAdd: RepositoryModelSchemaType[] = [];
    const repositoriesToUpdate: RepositoryModelSchemaType[] = [];

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
    const bulkOps: AnyBulkWriteOperation<RepositoryModelSchemaType>[] = [];

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
    })).lean();
  }

  async addRepository(
    installationId: number,
    repository: RepositoryModelSchemaType,
  ) {
    this.log?.debug({
      installationId,
      repositoryId: repository.id,
    }, `➕ Upserting repository`);

    await RepositoryModel.updateOne(
      { id: repository.id, installation_id: installationId },
      { $set: { ...repository, installation_id: installationId } },
      { upsert: true },
    );

    return await this.getRepository({
      installationId,
      repositoryId: repository.id,
    });
  }

  async deleteRepository(installationId: number, repositoryId: number) {
    this.log?.debug({
      installationId,
      repositoryId,
    }, `🗑️ Deleting repository`);
    return await RepositoryModel.findOneAndDelete({
      id: repositoryId,
      installation_id: installationId,
    }).lean();
  }

  async getInstallationByLogin(login: string) {
    this.log?.debug({
      login,
    }, `🔍 Getting installation by login`);
    return await InstallationModel.findOne({ "account.login": login }, {
      id: 1,
      _id: 0,
    }).lean();
  }
}
