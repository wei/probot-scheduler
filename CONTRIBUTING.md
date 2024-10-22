# Contributing

👋 Thanks for your interest in contributing! I’m glad you're here and excited to
help you get started if you have any questions.

Please note that this project is released with a
[Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this
project you agree to abide by its terms.

## Development

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/wei/probot-scheduler.git
   cd probot-scheduler
   ```

1. Set up your GitHub App. Follow the
   [Probot documentation](https://probot.github.io/docs/development/) for
   detailed instructions on creating a GitHub App.

1. Set up your environment variables by copying the `.env.example` file to
   `.env` and filling in the required values:
   ```sh
   cp .env.example .env
   ```

### Development Environment

This project uses Dev Containers to provide a consistent and isolated
development environment. It is defined in the `.devcontainer` folder and
includes all necessary dependencies and services.

#### Prerequisites

- [Docker](https://www.docker.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

#### Setting up the Development Environment

1. Open the project in Visual Studio Code.

1. When prompted, click "Reopen in Container" or run the "Dev Containers: Reopen
   in Container" command from the Command Palette (F1).

1. VS Code will build and start the development container, which may take a few
   minutes the first time.

1. Once the container is ready, you'll have a fully configured development
   environment with all necessary dependencies and services running.

#### Base Dev Environment

| **Container** | **Description**                   | **URL**                                            |
| ------------- | --------------------------------- | -------------------------------------------------- |
| **dev**       | The main dev container with deno. | [`http://localhost:3000`](http://localhost:3000)   |
| **mongodb**   | MongoDB database container.       | [`http://localhost:27017`](http://localhost:27017) |
| **redis**     | Redis container.                  | [`http://localhost:6379`](http://localhost:6379)   |

#### Full Dev Environment (amd64)

In addition to the containers above, the full dev environment includes the
following:

| **Container**       | **Description**        | **URL**                                          |
| ------------------- | ---------------------- | ------------------------------------------------ |
| **mongo-express**   | MongoDB web interface. | [`http://localhost:8081`](http://localhost:8081) |
| **redis-commander** | Redis web interface.   | [`http://localhost:8082`](http://localhost:8082) |
| **bullboard**       | BullMQ web interface.  | [`http://localhost:8083`](http://localhost:8083) |

### Starting the server

```sh
deno task dev
```

By default, the server will perform a full sync of all installations on startup.
Use the following command instead to skip the full sync:

```sh
deno task dev:skip-full-sync
```

This will start the API server and begin listening for GitHub webhook events and
scheduling jobs.

#### API Endpoints

- `GET /ping`: Health check endpoint
- `POST /api/github/webhooks`: GitHub webhook endpoint

**Admin Installation Endpoints**

- `GET /api/admin/installation/:installationIdOrLogin`: Get details about a
  specific installation.
- `GET /api/admin/installation/:installationIdOrLogin/process`: Manually trigger
  a sync for a specific installation.

**Admin Repository Endpoints**

- `GET /api/admin/repository/:owner/:repo/process`: Process the specified
  repository.
- `GET /api/admin/repository/:owner/:repo`: Get details about the specified
  repository.

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
