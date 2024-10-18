export enum QueueNames {
  JobQueue = "JobQueue",
}

export enum JobPriority {
  Low = 20,
  Normal = 10,
  High = 5,
}

export interface JobData {
  installation_id: number;
  repository_id: number;
  full_name: string;
  inserted_at: Date;
}
