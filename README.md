# Page Pulse — Production Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.37-blueviolet.svg)](https://sequelize.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-lightgrey.svg)](<>)

Page Pulse is a enterprise-grade, modular Node.js backend engine built with NestJS, TypeScript, Sequelize ORM, PostgreSQL, and Redis. It is architected around **Feature-Based Clean Architecture (Vertical Slices)** to ensure high cohesion, low coupling, fail-fast environment validation, and production resiliency.

---

## 📍 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Folder Structure](#-folder-structure)
- [Environment Variables](#-environment-variables)
- [Installation](#-installation)
- [Docker](#-docker)
- [Running Locally](#-running-locally)
- [Development Workflow](#-development-workflow)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Future Phases](#-future-phases)

---

## 🚀 Project Overview

Page Pulse is designed to serve as a reliable, scalable foundation for web application monitoring, audit trail tracking, and page analytics services. Key operational characteristics include:

- **Enterprise Modular Blueprint:** Strict separation between framework primitives (`common`), application configuration (`config`), database ORM (`database`), shared infrastructure (`shared`), and domain feature modules (`modules`).
- **Fail-Fast Startup Validation:** Environment schema validation executed via `class-validator` before port binding or database connection initialization.
- **Fail-Safe HTTP Pipeline:** Uniform JSON error responses via a global exception filter, request timing via RxJS interceptors, and correlation tracing via `x-request-id` UUID middleware.
- **Production Containerization:** Multi-stage Docker build producing isolated lightweight Linux Alpine runtime containers operating under a non-root `node` user.

---

## 🏛️ Architecture

Page Pulse follows **Feature-Based Clean Architecture (Vertical Slices)**:

```
Incoming Request
  │
  ├── RequestIdMiddleware ───────────────> Assigns/preserves x-request-id UUID header
  ├── LoggingInterceptor ────────────────> Starts execution timer
  ├── Global ValidationPipe ─────────────> Validates DTO payload & strips unknown properties
  ├── Controller Layer ──────────────────> HTTP Route Handler (GET /api/v1/health)
  ├── Service Layer ─────────────────────> Pure Business Domain Logic
  ├── Repository / Data Access Layer ───> Sequelize ORM Abstraction (PostgreSQL)
  ├── LoggingInterceptor ────────────────> Logs status code and execution duration (ms)
  └── GlobalExceptionFilter ─────────────> Intercepts uncaught errors -> Returns standard JSON error payload
```

### Core Architecture Principles

1. **Vertical Feature Slicing (`src/modules/`):** Features like `health` and `audit` contain their own controllers, services, repositories, DTOs, models, and interfaces in a self-contained folder.
2. **Explicit Data Access Layer:** Database queries are encapsulated inside Repositories, isolating domain business logic from ORM framework specifics.
3. **Fail-Fast Configuration:** Configuration values are validated on application boot. If any required environment variable is missing or malformed, the process exits immediately with actionable log output.
4. **No Direct ORM Auto-Sync in Production (`synchronize: false`):** Schema migrations must be version-controlled to protect production database integrity.

---

## 🛠️ Technology Stack

| Layer / Component        | Technology                              | Version     | Purpose                                             |
| ------------------------ | --------------------------------------- | ----------- | --------------------------------------------------- |
| **Core Framework**       | NestJS                                  | `^11.0.1`   | Modular Node.js framework with DI container         |
| **Language**             | TypeScript                              | `^5.7.3`    | Strongly-typed JavaScript with strict mode enabled  |
| **ORM**                  | Sequelize ORM                           | `^6.37.8`   | Database ORM with `sequelize-typescript` decorators |
| **Database**             | PostgreSQL                              | `16-alpine` | Relational database storage                         |
| **In-Memory Store**      | Redis                                   | `7-alpine`  | High-performance key-value cache & state store      |
| **HTTP Outbound Client** | Axios / `@nestjs/axios`                 | `^1.18.1`   | Asynchronous HTTP request client                    |
| **Validation**           | `class-validator` & `class-transformer` | `^0.15.1`   | Decorator-driven DTO & environment validation       |
| **Logging**              | `nestjs-pino` / `pino-http`             | `^4.6.1`    | Low-overhead structured JSON logging                |
| **Unit & E2E Testing**   | Jest & Supertest                        | `^30.0.0`   | Test runner and HTTP assertion engine               |
| **Code Quality**         | ESLint & Prettier                       | `^9.18.0`   | Flat ESLint rules & automated code formatter        |
| **Git Automation**       | Husky & lint-staged                     | `^9.1.7`    | Pre-commit hook runner targeting staged files       |

---

## 📁 Folder Structure

```
page-pulse/
├── .editorconfig            # Cross-IDE indentation and character set definitions
├── .env.example             # Documented environment variable template
├── .gitignore               # Excludes secrets, node_modules, and build outputs
├── .dockerignore            # Excludes local artifacts from Docker build context
├── Dockerfile               # Multi-stage container build (development, builder, production)
├── docker-compose.yml       # Container orchestration (app, postgres, redis)
├── eslint.config.mjs        # NestJS v11 flat ESLint configuration
├── nest-cli.json            # NestJS CLI build options
├── package.json             # Scripts, dependencies, lint-staged, and Jest config
├── tsconfig.json            # TypeScript compiler configuration & path aliases
├── tsconfig.build.json      # Production build compilation settings
├── src/
│   ├── main.ts              # Bootstrap entrypoint (Global prefix /api/v1, ValidationPipe, Filters)
│   ├── app.module.ts        # Root application module registering middleware & global modules
│   ├── app.controller.ts    # Default application controller
│   ├── app.service.ts       # Default application service
│   ├── config/              # Global Configuration Layer
│   │   ├── app-config.interface.ts  # TypeScript contracts for configuration objects
│   │   ├── app-config.module.ts     # Global NestJS module providing AppConfigService
│   │   ├── app-config.service.ts    # Strongly-typed ConfigService wrapper with getters
│   │   ├── configuration.ts         # Nested configuration factory mapping process.env
│   │   └── env.validation.ts        # Class-validator environment schema validation DTO
│   ├── database/            # Database Layer
│   │   ├── database.module.ts       # Global Database module registering SequelizeModule.forRootAsync
│   │   ├── sequelize.config.ts      # Sequelize options factory (pooling, retries, dialect)
│   │   └── sequelize.providers.ts   # Database provider tokens
│   ├── shared/              # Shared Application Infrastructure
│   │   └── redis/           # Global Redis Connection Module
│   │       ├── redis.constants.ts   # REDIS_CLIENT injection token
│   │       ├── redis.module.ts      # Shared Redis module with OnModuleDestroy hook
│   │       └── redis.providers.ts   # Async Redis client factory provider
│   ├── common/              # Framework Primitives & Utilities
│   │   ├── constants/       # Global constant tokens
│   │   ├── decorators/      # Custom NestJS parameter/method decorators
│   │   ├── dto/             # Shared reusable DTOs (e.g. PaginationQueryDto)
│   │   ├── enums/           # Universal domain enums
│   │   ├── exceptions/      # Custom domain HTTP exceptions
│   │   ├── filters/         # GlobalExceptionFilter formatting JSON error contracts
│   │   ├── guards/          # Security & RBAC authorization guards
│   │   ├── interceptors/    # LoggingInterceptor measuring execution latency
│   │   ├── interfaces/      # System generic contracts
│   │   ├── logger/          # Pino logger formatters
│   │   ├── middleware/      # RequestIdMiddleware injecting x-request-id UUID
│   │   ├── pipes/           # Custom validation & transformation pipes
│   │   ├── responses/       # API response wrapper utilities
│   │   ├── types/           # TypeScript utility types
│   │   └── utils/           # Pure side-effect-free helper functions
│   └── modules/             # Feature Modules (Vertical Slices)
│       ├── health/          # Operational Health Check Feature
│       │   ├── dto/health-response.dto.ts
│       │   ├── health.controller.ts
│       │   ├── health.module.ts
│       │   └── health.service.ts
│       └── audit/           # Audit Feature Module (Scaffolded)
│           ├── audit.module.ts
│           ├── constants/
│           ├── controllers/
│           ├── dto/
│           ├── interfaces/
│           ├── models/
│           ├── repositories/
│           ├── services/
│           └── validators/
└── test/                    # End-to-End Test Suite
    ├── app.e2e-spec.ts      # E2E integration test hitting GET /api/v1/health
    └── jest-e2e.json        # E2E Jest configuration with path alias mappings
```

---

## 🔐 Environment Variables

Environment variables are defined in `.env` (derived from `.env.example`). Every variable is validated on application boot:

| Variable                  | Type   | Default Value   | Validation Constraints                                       | Purpose & Description                            |
| ------------------------- | ------ | --------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `PORT`                    | Number | `3000`          | Min: 1, Max: 65535                                           | HTTP server binding port                         |
| `NODE_ENV`                | Enum   | `development`   | `development`, `production`, `test`, `staging`               | Application execution environment mode           |
| `DATABASE_HOST`           | String | `localhost`     | Required, non-empty                                          | PostgreSQL hostname or container network alias   |
| `DATABASE_PORT`           | Number | `5432`          | Min: 1, Max: 65535                                           | PostgreSQL database TCP port                     |
| `DATABASE_NAME`           | String | `page_pulse_db` | Required, non-empty                                          | PostgreSQL target database name                  |
| `DATABASE_USER`           | String | `postgres`      | Required, non-empty                                          | PostgreSQL database user account                 |
| `DATABASE_PASSWORD`       | String | `postgres`      | String                                                       | PostgreSQL authentication password               |
| `REDIS_HOST`              | String | `localhost`     | Required, non-empty                                          | Redis server hostname or container network alias |
| `REDIS_PORT`              | Number | `6379`          | Min: 1, Max: 65535                                           | Redis server TCP port                            |
| `CACHE_TTL`               | Number | `60`            | Min: 0                                                       | Default cache time-to-live (seconds)             |
| `REQUEST_TIMEOUT`         | Number | `5000`          | Min: 0                                                       | Axios HTTP outbound client request timeout (ms)  |
| `MAX_CONCURRENT_REQUESTS` | Number | `100`           | Min: 1                                                       | Max concurrent HTTP outbound requests allowed    |
| `RATE_LIMIT_LIMIT`        | Number | `100`           | Min: 1                                                       | Max HTTP requests allowed per client window      |
| `RATE_LIMIT_TTL`          | Number | `60`            | Min: 1                                                       | Rate limiter sliding window duration (seconds)   |
| `LOG_LEVEL`               | Enum   | `info`          | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` | Pino logger verbosity filter level               |

---

## 📦 Installation

### Prerequisites

- **Node.js:** `v20.15.1` or higher
- **npm:** `v10.7.0` or higher
- **PostgreSQL:** `v16` (or Docker)
- **Redis:** `v7` (or Docker)

### Setup Steps

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/prajapatijeel/page-pulse.git
   cd page-pulse
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment File:**
   Copy `.env.example` to `.env` and adjust database credentials to match your local setup:
   ```bash
   cp .env.example .env
   ```

---

## 🐳 Docker

The application is containerized using Docker and orchestrated via Docker Compose.

### Docker Services Overview

- **`app`:** NestJS container running Node.js 20 Alpine.
- **`postgres`:** PostgreSQL 16 Alpine container with health check (`pg_isready`) and named volume storage (`postgres_data`).
- **`redis`:** Redis 7 Alpine container with health check (`redis-cli ping`) and named volume storage (`redis_data`).
- **`page_pulse_network`:** Dedicated bridge network allowing container-to-container communication.

### Docker Commands

**Start Stack in Detached Mode:**

```bash
docker compose up -d --build
```

**Check Container Status & Health:**

```bash
docker compose ps
```

**View Live Application Logs:**

```bash
docker compose logs -f app
```

**Stop Container Stack:**

```bash
docker compose down
```

**Stop Stack and Remove Data Volumes:**

```bash
docker compose down -v
```

---

## 💻 Running Locally

### Development Mode (with Hot Reloading)

```bash
npm run start:dev
```

### Debug Mode

```bash
npm run start:debug
```

### Production Mode (Local Build Test)

```bash
npm run build
npm run start:prod
```

### Health Check Endpoint Verification

```bash
curl http://localhost:3000/api/v1/health
```

**Expected Response (HTTP 200 OK):**

```json
{
  "status": "ok",
  "service": "Page Pulse API",
  "timestamp": "2026-07-25T15:00:00.000Z"
}
```

---

## 🔄 Development Workflow

### Code Quality Enforcement

- **Linting & Auto-Fix:**
  ```bash
  npm run lint
  ```
- **Lint Check (CI Non-Zero Exit):**
  ```bash
  npm run lint:check
  ```
- **Code Formatting:**
  ```bash
  npm run format
  ```

### Pre-Commit Hooks (Husky & lint-staged)

Husky automatically executes `.husky/pre-commit` on every `git commit`. It invokes `lint-staged`, which runs:

1. `eslint --fix` on staged `.ts` files.
2. `prettier --write` on staged `.ts` files.

---

## 🧪 Testing

The repository contains unit test suites and end-to-end integration test suites.

### Run Unit Tests

```bash
npm run test
```

### Run Unit Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Test Coverage Report

```bash
npm run test:cov
```

### Run End-to-End (E2E) Integration Tests

```bash
npm run test:e2e
```

**Current Verification Status:**

- Unit Test Suites: **10 passed** (18 tests total)
- E2E Test Suites: **1 passed** (`GET /api/v1/health` returning HTTP 200 OK)

---

## 🚢 Deployment

### Production Compilation

Execute the TypeScript compiler build:

```bash
npm run build
```

This outputs production-ready JavaScript bundles to the `./dist` directory.

### Production Container Deployment

Build the production multi-stage target:

```bash
docker build --target production -t page-pulse:latest .
docker run -p 3000:3000 --env-file .env page-pulse:latest
```

### Production Checklist

1. Ensure `NODE_ENV=production` is set in environment variables.
2. Set strong passwords for `DATABASE_PASSWORD`.
3. Set `LOG_LEVEL=info` or `warn` to eliminate verbose debug log I/O.
4. Verify database schema migrations have been run prior to starting the application process (`synchronize: false` is enforced).

---

## 🔮 Future Phases

- **Phase 2 — Authentication & Security:** JWT authentication, Refresh Token rotation, Password hashing (Argon2id/Bcrypt), Role-Based Access Control (RBAC) guards.
- **Phase 3 — Audit Logging Engine:** Audit event interceptors, database persistence models, search & filtering query repositories.
- **Phase 4 — Page Monitoring & Analytics:** Webpage health probes, response timing metrics, uptime monitoring workers.
- **Phase 5 — Webhooks & Alert Notifications:** Outbound webhook dispatchers, exponential backoff retry queues, Email/Slack notifications.
- **Phase 6 — Observability & CI/CD:** Prometheus metric exports, Grafana dashboards, GitHub Actions CI/CD pipelines.

---

## 📄 License

UNLICENSED — Page Pulse Internal Project. All rights reserved.
