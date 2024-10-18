export enum QueueName {
  RepoJobQueue = "RepoJobQueue",
}

export enum JobPriority {
  Low = 20,
  Normal = 10,
  High = 5,
}

export interface RepoJobData {
  installation_id: number;
  repository_id: number;
  full_name: string;
  inserted_at: Date;
}
