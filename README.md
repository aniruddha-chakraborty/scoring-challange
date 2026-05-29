# Repository Popularity Score Service

Initial TypeScript Node.js service structure using class-based controller,
service, and repository layers.

## Structure

```text
src/
  app.ts
  controllers/
  services/
  repositories/
  models/
  middlewares/
  utils/
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

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

Available endpoints:

- `GET /health`
- `GET /repositories?language=TypeScript&createdAfter=2024-01-01&limit=30&offset=0`

Environment variables:

- `GITHUB_TOKEN`: GitHub token for higher API rate limits.
- `REDIS_URL`: Required Redis connection URL, for example `redis://localhost:6379`.
- `CACHE_TTL_SECONDS`: Cache TTL in seconds. Defaults to `300`.
