[![probot-scheduler][social-image]][social-image-url]

---

[![JSR][jsr-badge]][jsr-url] ![Deno][deno-badge] ![TypeScript][typescript-badge]
[![CI][ci-badge]][ci-url] [![License: MIT][license-badge]][license-url]

Probot Scheduler is a GitHub App built with [Probot](https://probot.github.io/)
that synchronizes GitHub App Installations to MongoDB and schedules them for
processing.

## Features

- Synchronizes GitHub App installations with a local MongoDB database
- Handles GitHub webhook events for installations and repositories
- Schedules jobs using BullMQ and Redis
- Built with TypeScript and Deno for improved DX and type safety

## Dependencies

- [BYO Probot GitHub App](https://probot.github.io/docs/development/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

## Usage

### Using Probot Scheduler in another Probot App

1. Install the package:

```sh
# npm
npx jsr add @wei/probot-scheduler

# Deno
deno add jsr:@wei/probot-scheduler
```

2. Configuration

Make sure to set up the required environment variables in your `.env` file. See
the `.env.example` file for a list of available options.

3. Import and use the scheduler in your Probot app:

```typescript
// Initialize MongoDB and Redis before the scheduler app
import mongoose from "mongoose";
await mongoose.connect(INSERT_MONGO_URL);

const redisClient = new Redis(INSERT_REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});
```

```typescript
import { Probot } from "probot";
import { createSchedulerApp } from "@wei/probot-scheduler";

export default (app: Probot) => {
  // Your existing Probot app logic
  app.on("issues.opened", async (context) => {
    // ...
  });

  createSchedulerApp(app, {
    // Optional: Skip the initial full sync
    skipFullSync: false,

    redisClient,

    // Define custom repository scheduling
    getRepositorySchedule: async (repository, currentMetadata) => {
      let randomMinute = Math.floor(Math.random() * 60);
      return {
        repository_id: repository.id,
        cron: `${randomMinute} */1 * * *`, // Every hour at a random minute
        job_priority: JobPriority.High,
      };
    },
  });
};
```

<details>
<summary>Custom Repository Scheduling</summary>

You can define custom scheduling for each repository by providing a
`getRepositorySchedule` function when creating the scheduler app. This function
allows you to set custom cron schedules and job priorities for each repository.

#### SchedulerAppOptions

When initializing the scheduler app, you can pass an options object of type
`SchedulerAppOptions`:

```typescript
interface SchedulerAppOptions {
  skipFullSync?: boolean;
  redisClient?: Redis;
  getRepositorySchedule?: (
    repository: RepositorySchemaType,
    currentMetadata?: RepositoryMetadataSchemaType,
  ) => Promise<RepositoryMetadataSchemaType>;
}
```

- `skipFullSync`: (optional) If set to `true`, the initial full sync of all
  installations will be skipped.
- `redisClient`: (optional) A Redis client instance. If not provided, a new
  Redis client will be created using the `REDIS_URL` environment variable.
- `getRepositorySchedule`: (optional) A function that determines the schedule
  for each repository.

#### getRepositorySchedule Function

The `getRepositorySchedule` function is called for each repository and should
return a `RepositoryMetadataSchemaType` object:

```typescript
interface RepositoryMetadataSchemaType {
  repository_id: number;
  cron: string;
  job_priority: JobPriority;
}

enum JobPriority {
  Low = 20,
  Normal = 10,
  High = 5,
}
```

This function receives two parameters:

1. `repository`: The current repository information.
2. `currentMetadata`: The existing metadata for the repository (if any).

It should return a Promise that resolves to a `RepositoryMetadataSchemaType`
object containing:

- `repository_id`: The ID of the repository.
- `cron`: A cron expression for scheduling the repository.
- `job_priority`: The priority of the job (use `JobPriority` enum).

#### Example Usage

Here's an example of how to use the scheduler with custom options:

```typescript
createSchedulerApp(app, {
  // Optional: Skip the initial full sync
  skipFullSync: false,

  // Define custom repository scheduling
  getRepositorySchedule: async (repository, currentMetadata) => {
    // Your custom logic to determine the schedule
    let randomMinute = Math.floor(Math.random() * 60);
    let cron = `${randomMinute} */1 * * *`; // Every hour at a random minute
    let jobPriority = JobPriority.Normal;

    // Example: Set different schedules based on repository properties
    if (repository.stargazers_count > 100) {
      cron = `*/30 * * * *`; // Every 30 minutes for popular repos
      jobPriority = JobPriority.High;
    } else if (repository.private) {
      cron = `${randomMinute} */6 * * *`; // Every 6 hours for private repos
    } else if (repository.fork) {
      cron = `${randomMinute} */12 * * *`; // Every 12 hours for forked repos
      jobPriority = JobPriority.Low;
    }
    // You can also use currentMetadata to make decisions if needed
    if (
      currentMetadata && currentMetadata.job_priority === JobPriority.High
    ) {
      jobPriority = JobPriority.High; // Maintain high priority if it was set before
    }
    return {
      repository_id: repository.id,
      cron,
      job_priority: jobPriority,
    };
  },
});
```

</details>

### Defining a Custom Worker

To define a custom worker that consumes messages from the scheduler:

1. Create a new file for your worker (e.g., `scheduler-worker.ts`):

```typescript
import { createWorker, type SchedulerJobData } from "@wei/probot-scheduler";
import { Redis } from "ioredis";

const redisClient = new Redis(INSERT_REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

const worker = createWorker(
  myJobProcessor, // Processor can also be a string or URL to a processor file
  {
    connection: redisClient,
    concurrency: 3,
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

async function myJobProcessor(job: Job<SchedulerJobData>) {
  console.log(`Processing job ${job.id} for repository`, {
    installationId: job.data.installation_id,
    repositoryId: job.data.repository_id,
    owner: job.data.owner,
    repo: job.data.repo,
  });
  // Add your custom logic here
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT

[social-image]: https://socialify.git.ci/wei/probot-scheduler/image?description=1&font=Raleway&language=1&logo=https%3A%2F%2Fprobot.github.io%2Fassets%2Fimg%2Flogo.png&name=1&owner=1&pattern=Circuit%20Board&theme=Auto
[social-image-url]: https://socialify.git.ci/wei/probot-scheduler?description=1&font=Raleway&language=1&logo=https%3A%2F%2Fprobot.github.io%2Fassets%2Fimg%2Flogo.png&name=1&owner=1&pattern=Circuit%20Board&theme=Auto
[deno-badge]: https://img.shields.io/badge/Deno-000000?logo=Deno&logoColor=FFF&style=flat-square
[typescript-badge]: https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square
[license-url]: https://wei.mit-license.org
[ci-badge]: https://img.shields.io/github/actions/workflow/status/wei/probot-scheduler/publish.yml?logo=github&style=flat-square
[ci-url]: https://github.com/wei/probot-scheduler/actions/workflows/publish.yml
[jsr-badge]: https://jsr.io/badges/@wei/probot-scheduler?style=flat-square
[jsr-url]: https://jsr.io/@wei/probot-scheduler
