# Repository Popularity Score Service

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

## Run

Local development:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

## Make Commands

The project includes a `Makefile` as a shortcut layer over common npm and
Docker commands.

```bash
make install
```

Installs Node dependencies with `npm install`.

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

Available endpoints:

- `GET /health`
- `GET /repositories?language=TypeScript&createdAfter=2024-01-01&limit=30&offset=0`

Environment variables:

- Local development can use a `.env` file. See `.env.example`.
- `GITHUB_TOKEN`: GitHub token for higher API rate limits.
- `REDIS_URL`: Required Redis connection URL, for example `redis://localhost:6379`.
- `CACHE_TTL_SECONDS`: Cache TTL in seconds. Defaults to `300`.
