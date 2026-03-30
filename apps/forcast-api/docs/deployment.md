# Deployment Guide

## Overview

The forecast-api is a mock API that simulates flood forecast data sources for development and testing.

## Docker Image

**Image Name:** `esatya/rahat-mock-forecast`

**Tags:**

- `dev` - Latest dev build
- `dev-{commit_sha}-{run_id}` - Versioned builds

## CI/CD Pipeline

The workflow is defined in `.github/workflows/Dev-Mock-Forcast-CICD.yaml`.

### Trigger Conditions

Pipeline runs when:

- Push to `dev` branch
- Pull request to `dev` branch
- Manual trigger (workflow_dispatch)

Only triggers on changes to:

- `apps/forcast-api/**`
- `packages/**`

### Build Process

1. Checkout code
2. Setup pnpm 8.14.1 and Node.js 20
3. Install dependencies: `pnpm install --frozen-lockfile`
4. Generate Prisma client: `pnpm --filter @lib/database db:generate`
5. Build app: `pnpm run build:forcast`
6. Build and push Docker image

### Secrets Required

| Secret        | Description                |
| ------------- | -------------------------- |
| `VAULT_URL`   | HashiCorp Vault URL        |
| `VAULT_TOKEN` | Vault authentication token |

Vault provides Docker Hub credentials automatically.

## API Endpoints

### Health & Status

| Method | Endpoint  | Description   |
| ------ | --------- | ------------- |
| GET    | `/`       | Hello message |
| GET    | `/health` | Health check  |

### Forecast APIs

| Method | Endpoint                               | Description               |
| ------ | -------------------------------------- | ------------------------- |
| GET    | `/forecast/river`                      | DHM river forecast data   |
| GET    | `/forecast/glofas`                     | GloFAS flood forecast     |
| POST   | `/forecast/gauges:searchGaugesByArea`  | Search GFH gauges by area |
| GET    | `/forecast/gaugeModels:batchGet`       | Get GFH gauge metadata    |
| GET    | `/forecast/gauges:queryGaugeForecasts` | Get GFH gauge forecasts   |

## Data Sources

This API mocks the following data sources:

| Source | Description                                                          | Status |
| ------ | -------------------------------------------------------------------- | ------ |
| DHM    | Department of Hydrology and Meteorology (Nepal) - River water levels | Mocked |
| GloFAS | Global Flood Awareness System - Global flood forecasts               | Mocked |
| GFH    | Google Flood Hub - Gauge data and forecasts                          | Mocked |

### DHM Mock Data

- Returns hourly water level readings
- Simulates 10% failure rate for testing error handling

### GloFAS Mock Data

- Returns station information with flood probability
- Uses database settings for dynamic response generation
- Template-based HTML response mimicking actual GloFAS API

### GFH Mock Data

- Returns HYBAS gauge locations
- Provides gauge metadata and forecast responses

## Database Setup

### Migrations

Run database migrations before starting the app:

```bash
pnpm --filter @lib/database db:migrate
```

For production deployments:

```bash
pnpm --filter @lib/database db:deploy
```

### Seeding Mock Data

The forecast-api requires mock seed data. Run only the seed files with `mock` in their filename:

| Seed File                        | Description                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `seed-mock-datasource.ts`        | Mock datasource settings (DHM, GloFAS, GFH locations and stations) |
| `seed-mock-datasource-config.ts` | Mock datasource URLs pointing to forecast-api endpoints            |

Run mock seeds individually:

```bash
cd packages/database
npx tsx prisma/seeds/seed-mock-datasource.ts
npx tsx prisma/seeds/seed-mock-datasource-config.ts
```

Or run all seeds (includes non-mock seeds):

```bash
pnpm --filter @lib/database seed
```

> **Note:** Mock seeds populate the `mock` schema in PostgreSQL. The mock datasource config points to `http://localhost:3005/v1/forecast/*` endpoints by default.

## Environment Variables

```env
PORT=8000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Running with Docker

```bash
# Pull the image
docker pull esatya/rahat-mock-forecast:dev

# Run the container
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  esatya/rahat-mock-forecast:dev
```
