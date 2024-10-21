[![probot-scheduler][social-image]][social-image-url]

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
  });
};
```

### Defining a Custom Worker

To define a custom worker that consumes messages from the scheduler:

1. Create a new file for your worker (e.g., `scheduler-worker.ts`):

```typescript
import { createWorker, type SchedulerJobData } from "@wei/probot-scheduler";
import { Redis } from "ioredis";

const redisClient = new Redis(INSERT_REDIS_URL);

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
  console.error(`Job ${job.id} failed: ${err.message}`);
});

async function myJobProcessor(job: Job<SchedulerJobData>) {
  console.log(`Processing job ${job.id} for repository`, {
    installationId: job.data.installation_id,
    repositoryId: job.data.repository_id,
    fullName: job.data.full_name,
  });
  // Add your custom logic here
}
```

## Development

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/wei/probot-scheduler.git
   cd probot-scheduler
   ```

2. Set up your environment variables by copying the `.env.example` file to
   `.env` and filling in the required values:
   ```
   cp .env.example .env
   ```

3. Set up your GitHub App and update the `.env` file with your app's
   credentials. Follow the
   [Probot documentation](https://probot.github.io/docs/development/) for
   detailed instructions on creating a GitHub App.

### Starting the server

```
deno task dev
```

This will start the server and begin listening for GitHub webhook events and
scheduling jobs.

#### API Endpoints

- `POST /api/github/webhooks`: GitHub webhook endpoint
- `GET /api/admin/installation/:installationIdOrLogin`: Get details about a
  specific installation
- `POST /api/admin/installation/:installationIdOrLogin`: Manually trigger a sync
  for a specific installation

### Starting the worker

```
deno task worker
```

This will start a sample worker process that handles scheduled jobs.

### Running a full sync

To manually trigger a full sync of all installations:

```
deno task full-sync
```

### Running Tests

To run the tests:

```
deno task test
```

### Linting and Formatting

To lint and format the code:

```
deno lint
deno fmt
```

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
