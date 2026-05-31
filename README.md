# Repository Popularity Score Service

[![CI](https://github.com/aniruddha-chakraborty/scoring-challange/actions/workflows/ci.yml/badge.svg)](https://github.com/aniruddha-chakraborty/scoring-challange/actions/workflows/ci.yml)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![typescript](https://img.shields.io/badge/typescript-5.x-blue)
![express](https://img.shields.io/badge/api-Express%20REST-blue)
![redis](https://img.shields.io/badge/cache-Redis-red)
![jest](https://img.shields.io/badge/tests-Jest-brightgreen)
![coverage](https://img.shields.io/badge/coverage-86.02%25-brightgreen)
![docker](https://img.shields.io/badge/docker-compose-blue)
![artillery](https://img.shields.io/badge/benchmarks-Artillery-blue)
![audit](https://img.shields.io/badge/audit-0%20vulnerabilities-brightgreen)

Backend service for searching GitHub repositories and assigning each repository
a popularity score. The API lets users filter repositories by language and
earliest creation date, then ranks results using stars, forks, and update
recency.

The project is built with TypeScript, Express, Redis caching, and a class-based
controller, service, and repository structure.

## Structure

```text
src/
  app.ts -> Creates and starts the Express application.
  config.ts -> Loads `.env` and exposes runtime configuration.
  controllers/ -> Handles HTTP request parsing, validation, and responses.
  services/ -> Contains business logic, scoring, caching flow, and orchestration.
  repositories/ -> Talks to external systems such as GitHub API and Redis.
  models/ -> Defines shared TypeScript types for repositories and scores.
  middlewares/ -> Contains Express middleware such as centralized error handling.
  utils/ -> Contains small reusable helper functions and HTTP error classes.

tests/
  app.test.ts -> Tests Express app wiring and mounted routes.
  config.test.ts -> Tests environment-backed config defaults and values.
  integration.ts -> Sends black-box HTTP requests to a running app.
  controllers/ -> Tests controller request parsing and validation behavior.
  services/ -> Tests scoring, sorting, cache lookup, and service orchestration.
  repositories/ -> Tests GitHub API mapping/validation and Redis cache behavior.
  middlewares/ -> Tests centralized error handling behavior.
  utils/ -> Tests helper utilities such as date and score calculations.
  helpers/ -> Contains reusable Jest test helpers, such as config mocks.
```

## Layers

- Controllers handle HTTP request and response details.
- Services contain business rules and orchestration.
- Repositories isolate persistence and data access.

## Scoring

Repositories are scored from 0 to 100 using weighted factors:

- Stars: 50%
- Forks: 30%
- Update recency: 20%

Stars and forks are normalized against the returned result set. Recency decays
linearly over 365 days from the repository `updated_at` timestamp.

## Cache

Repository score responses are cached in Redis. `REDIS_URL` is required when
starting the application. The cache key is the request query string, for
example:

```text
?language=Go&createdAfter=2024-06-01&limit=10&offset=0
```

The cached value is the full JSON response:

```json
{
  "data": []
}
```

## Prerequisites

The `Makefile` commands require the `make` command-line tool.

On macOS, install the Xcode command line tools:

```bash
xcode-select --install
```

If you use Homebrew and want GNU Make specifically:

```bash
brew install make
```

On Debian or Ubuntu:

```bash
sudo apt update
sudo apt install make
```

On Fedora:

```bash
sudo dnf install make
```

On Arch Linux:

```bash
sudo pacman -S make
```

Verify the installation:

```bash
make --version
```

## Run

Local development:

```bash
make dev
```

Build for production:

```bash
npm run build
npm start
```

## Production Notes

For a production deployment, the API and Redis would be deployed as separate
services. The API is stateless apart from Redis-backed caching, so it can be
scaled horizontally behind a load balancer. Runtime configuration is provided
through environment variables, including GitHub authentication, Redis URL, and
cache TTL.

## Make Commands

The project includes a `Makefile` as a shortcut layer over common npm and
Docker commands.

```bash
make install
```

Installs Node dependencies with `npm install`.

```bash
make audit
```

Runs `npm audit` and fails if npm reports security vulnerabilities.

```bash
make build
```

Builds the TypeScript source into `dist/`.

```bash
make test
```

Runs the Jest unit test suite. These tests use mocks and stubs where needed,
so Docker is not required for the normal test suite.

```bash
make up
```

Starts the Docker services in the background, including the API and Redis.

```bash
make integration
```

Runs the black-box HTTP integration tests in `tests/integration.ts`. These
tests expect the app to already be running, so start Docker first.

```bash
make performance
```

Runs the Artillery performance test against the cached repository search URL.
This command first warms the cache with one request, then runs the load test.

```bash
make down
```

Stops the Docker services.

Typical integration-test flow:

```bash
make up
make integration
make down
```

To run the full flow with one command:

```bash
make complete-integration
```

To run the performance test with Docker startup and shutdown:

```bash
make complete-performance
```

Other useful commands:

```bash
make dev      # Run the local development server
make start    # Run the built app locally
make restart  # Restart Docker services with rebuild
make clean    # Remove local build output
```

## Performance Testing

Performance testing uses Artillery and targets one repository search URL:

```text
GET /repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=0
```

The scenario is defined in `performance/repositories.yml`.

To avoid repeatedly calling GitHub during the load test, `make performance`
does a warmup request first. That warmup fills Redis for the exact query string,
then Artillery runs 20 virtual users. Each virtual user sends the same cached
request 100 times.

```bash
make performance
```

If the app is not already running, use:

```bash
make complete-performance
```

The default target is `http://localhost:3000`. To point the test somewhere
else:

```bash
make performance PERF_TARGET=http://localhost:4000
```

Latest local cached performance result from `make complete-performance`
on 2026-05-31:

This result measures the warmed Redis cache path for the repository search
query above. It does not represent cold-cache GitHub API latency.

```text
Total requests: 2000
HTTP 200 responses: 2000
Failed virtual users: 0
Request rate: 1990/sec
Downloaded bytes: 7266000
Mean response time: 0.8 ms
Median response time: 1 ms
p95 response time: 2 ms
p99 response time: 3 ms
Max response time: 16 ms
Total test time: 3 seconds
```

Available endpoints:

- `GET /health`
- `GET /repositories?language=TypeScript&createdAfter=2024-01-01&limit=30&offset=0`

Environment variables:

- Local development can use a `.env` file. See `.env.example`.
- `GITHUB_TOKEN`: GitHub token for higher API rate limits.
- `REDIS_URL`: Required Redis connection URL, for example `redis://localhost:6379`.
- `CACHE_TTL_SECONDS`: Cache TTL in seconds. Defaults to `300`.
