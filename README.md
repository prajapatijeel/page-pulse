# Page Pulse

Page Pulse is a production-oriented URL audit API. It fetches a public web page, measures the request, extracts useful HTML metadata, persists the audit result, and caches successful results for fast repeat lookups. The project demonstrates a NestJS backend built with clean boundaries, resilient request handling, observability, and automated quality checks.

## Features

- URL audit endpoint with DTO validation and URL normalization
- HTTP fetching with redirects, configurable timeouts, and categorized failures
- Metadata extraction: title, description, content length, final URL, HTTPS status, and response details
- PostgreSQL persistence through Sequelize
- Redis-backed cache with configurable TTL
- Concurrency-limited audit queue with queue-overflow protection
- Per-client-IP global rate limiting; health and Swagger endpoints are excluded
- Request IDs, including preservation of a caller-provided `X-Request-ID`
- Structured request and application-event logging
- Global exception filter with safe, consistent error responses
- Swagger/OpenAPI documentation
- Jest unit tests and Supertest/Nest integration tests
- GitHub Actions CI for linting, tests, coverage, and builds

## Architecture

The application uses a practical Clean Architecture style: HTTP concerns are kept at the edge, application services coordinate use cases, and infrastructure integrations are encapsulated behind focused services and repositories.

| Location | Responsibility |
| --- | --- |
| `src/modules/audit` | Audit feature slice: controller, DTO, service, queue, fetcher, parser, repository, and Sequelize model. |
| `src/modules/health` | Lightweight health endpoint. |
| `src/common` | Cross-cutting middleware, interceptor, guards, exception filter, response contracts, and validation helpers. |
| `src/shared/redis` | Redis client provider and cache abstraction. |
| `src/config` | Typed, validated environment configuration. |
| `src/database` | Sequelize and PostgreSQL setup. |
| `test` | End-to-end/integration test configuration and tests. |
| `.github/workflows` | Continuous-integration workflow. |

Controllers remain thin: they accept validated input and delegate to services. `AuditService` coordinates cache lookup, queued execution, persistence, fetching, parsing, and response composition. External dependencies are isolated so tests can mock them without contacting real websites, Redis, or PostgreSQL.

## Technology Stack

- [NestJS](https://nestjs.com/) and TypeScript
- Sequelize with PostgreSQL
- Redis and `cache-manager`
- Axios for outbound HTTP requests
- Cheerio for HTML metadata parsing
- `p-queue` for audit concurrency control
- `@nestjs/throttler` for rate limiting
- Swagger/OpenAPI via `@nestjs/swagger`
- Jest and Supertest
- GitHub Actions

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL 16+ (or a compatible local version)
- Redis 7+ (or a compatible local version)

## Installation

```bash
git clone <your-repository-url>
cd page-pulse
npm ci
```

Create your local environment file from the template:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Create a PostgreSQL database matching `DATABASE_NAME` (the default is `page_pulse_db`) and ensure Redis is running on the configured host and port. For example, with Docker:

```bash
docker run --name page-pulse-postgres -e POSTGRES_DB=page_pulse_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
docker run --name page-pulse-redis -p 6379:6379 -d redis:7-alpine
```

Start the development server:

```bash
npm run start:dev
```

The API is available at `http://localhost:3000/api/v1`.

## Environment Variables

All runtime configuration is read through `ConfigService` and validated at startup. Do not commit `.env` files containing real credentials.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port. |
| `NODE_ENV` | `development` | One of `development`, `production`, `test`, or `staging`. |
| `DATABASE_URL` | — | Managed PostgreSQL connection URL. When set, it takes precedence over individual `DATABASE_*` values. |
| `DATABASE_HOST` | `localhost` | PostgreSQL host when `DATABASE_URL` is not set. |
| `DATABASE_PORT` | `5432` | PostgreSQL port. |
| `DATABASE_NAME` | `page_pulse_db` | PostgreSQL database name. |
| `DATABASE_USER` | `postgres` | PostgreSQL user. |
| `DATABASE_PASSWORD` | `postgres` | PostgreSQL password. Use a secret in production. |
| `REDIS_URL` | — | Managed Redis connection URL. When set, it takes precedence over `REDIS_HOST` and `REDIS_PORT`. |
| `REDIS_HOST` | `localhost` | Redis host when `REDIS_URL` is not set. |
| `REDIS_PORT` | `6379` | Redis port. |
| `CACHE_TTL` | `60` | Successful audit cache lifetime in seconds. |
| `REQUEST_TIMEOUT` | `5000` | Fallback outbound request timeout in milliseconds. |
| `AUDIT_REQUEST_TIMEOUT` | `10000` | Audit-specific outbound timeout in milliseconds; takes precedence over `REQUEST_TIMEOUT`. |
| `MAX_CONCURRENT_REQUESTS` | `100` | Configured maximum concurrent HTTP requests. |
| `AUDIT_MAX_CONCURRENT` | `5` | Maximum audits executing concurrently. |
| `AUDIT_MAX_QUEUE` | `100` | Maximum audits waiting in the queue before the API returns `503`. |
| `RATE_LIMIT_LIMIT` | `100` | Requests allowed from one client IP in each rate-limit window. |
| `RATE_LIMIT_TTL` | `60` | Rate-limit window in seconds. |
| `LOG_LEVEL` | `info` | Application log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent`. |

## API Documentation

With the server running, open Swagger UI at:

`http://localhost:3000/api/docs`

Swagger documents the audit request contract and lets you execute requests in the browser. Swagger itself is excluded from rate limiting.

## API Endpoints

All application routes use the `/api/v1` prefix.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Basic application greeting. |
| `GET` | `/health` | Health status. Excluded from rate limiting. |
| `POST` | `/audit` | Audits a public URL. |

### Audit a URL

```http
POST /api/v1/audit
Content-Type: application/json
X-Request-ID: assessment-demo-001

{
  "url": "https://example.com"
}
```

Example successful response:

```json
{
  "success": true,
  "message": "Audit completed successfully",
  "data": {
    "id": "7d1bf7cf-7e94-4246-99c4-8e1ab6e3ad4f",
    "url": "https://example.com",
    "finalUrl": "https://example.com/",
    "status": "COMPLETED",
    "statusCode": 200,
    "statusText": "OK",
    "responseTime": 142,
    "title": "Example Domain",
    "description": null,
    "contentLength": 1256,
    "https": true,
    "cached": false
  }
}
```

The response includes `X-Request-ID`. If the caller sends that header, its value is reused; otherwise the API generates a UUID.

### Health Check

```http
GET /api/v1/health
```

```json
{
  "status": "ok",
  "service": "Page Pulse API",
  "timestamp": "2026-07-28T10:00:00.000Z"
}
```

### Error Format

All handled and unexpected failures use the same safe response structure. Internal stack traces, database errors, and raw Axios errors are logged internally but never sent to the caller.

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed.",
  "timestamp": "2026-07-28T10:00:00.000Z",
  "path": "/api/v1/audit",
  "requestId": "assessment-demo-001",
  "fieldErrors": [
    {
      "field": "url",
      "messages": ["url must be a valid URL"]
    }
  ]
}
```

When a rate limit is exceeded, the API returns `429` with `errorCode: "RATE_LIMIT_EXCEEDED"`. A timed-out audit returns `504` with `errorCode: "AUDIT_TIMEOUT"`.

## Caching Flow

1. Page Pulse normalizes the submitted URL and derives a cache key.
2. It checks Redis before entering the audit queue.
3. On a cache hit, it returns the stored successful audit immediately with `data.cached: true`; no network call or database write occurs.
4. On a cache miss, it queues the audit, fetches and parses the page, persists the result, and stores the successful response in Redis for `CACHE_TTL` seconds.

## Audit Flow

1. `RequestIdMiddleware` accepts or generates a request ID and sets `X-Request-ID`.
2. The global throttler applies the per-IP limit (except health and Swagger).
3. The validation pipe validates and transforms the request DTO.
4. `AuditService` emits an `Audit Started` event and checks the Redis cache.
5. A cache miss is submitted to the bounded concurrency queue.
6. The service creates a pending PostgreSQL record, fetches the URL, and measures the response.
7. HTML metadata is extracted and the database record is updated to `COMPLETED`, or failure details are persisted.
8. Successful results are cached; timeout and queue failures map to safe HTTP errors.
9. `LoggingInterceptor` records method, URL, response status, elapsed time, client IP, user agent, and request ID.
10. `GlobalExceptionFilter` provides the standardized error format and logs detailed failure context internally.

## Testing

The test suite uses Jest and Nest's `TestingModule`. External services and outbound URLs are mocked in unit tests. The E2E suite boots the application and verifies the health endpoint, including request ID behavior.

```bash
# Unit tests
npm test -- --runInBand

# Watch mode
npm run test:watch

# End-to-end/integration tests
npm run test:e2e -- --runInBand

# Coverage report
npm run test:cov -- --runInBand

# Lint and build
npm run lint:check
npm run build
```

Coverage output is written to `coverage/`. The project enforces a global statement coverage threshold of 80%.

## CI Pipeline

GitHub Actions runs on every push and pull request through [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The workflow:

1. Checks out the repository and sets up Node.js 20.
2. Restores/caches npm dependencies and runs `npm ci`.
3. Starts isolated PostgreSQL and Redis service containers.
4. Supplies CI-only database and Redis configuration through workflow environment variables; it does not read a developer's local `.env` file.
5. Runs ESLint, unit tests, E2E tests, coverage generation, and the production build.
6. Uploads the coverage directory as a workflow artifact, even if an earlier test step fails.

Any failed quality gate fails the workflow.

## Future Improvements

- Database migrations and a migration deployment strategy
- Authentication/authorization for protected audit usage
- OpenTelemetry tracing and centralized structured-log ingestion
- Redis-backed distributed rate limiting for multi-instance deployments
- Background-job workers and durable queue storage
- URL allow/deny policies and SSRF protection for outbound requests
- Health checks for PostgreSQL and Redis dependencies
- Metrics, dashboards, alerting, and SLOs
- Containerization and deployment manifests

## License

MIT
