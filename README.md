# Rahat Triggers - NestJS Monorepo

A monorepo containing the Rahat Triggers system built with NestJS and Turborepo. This project provides a scalable architecture for monitoring external data sources (DHM, GLOFAS, GFH), standardizing observations, and triggering alerts based on configurable conditions.

## Project Structure

This monorepo contains the following applications and packages:

### Applications

- **rahat-triggers** - Main triggers microservice application that monitors data sources, processes observations, and manages trigger conditions

### Core Packages

- **@lib/core** - Shared core package containing:
  - `ObservationAdapter` base interface for data source adapters
  - `HealthMonitoringService` for tracking adapter health metrics
  - `HealthCacheService` for persisting health data in Redis
  - Result types for functional error handling
  - Shared types and interfaces

- **@lib/database** - Shared database package with:
  - Prisma ORM integration and schema definitions
  - NestJS modules for database access
  - Database utilities and helpers
  - Seed scripts for initial data

### Adapter Packages

- **@lib/dhm-adapter** - Department of Hydrology and Meteorology (DHM) data adapter
  - DHM Rainfall observations
  - DHM Water Level observations
- **@lib/glofas-adapter** - Global Flood Awareness System (GLOFAS) data adapter
  - River discharge forecasts
  - Flood prediction data

- **@lib/gfh-adapter** - Google Flood Hub (GFH) data adapter
  - Google flood forecast data

### Configuration Packages

- **@workspace/eslint-config** - Shared ESLint configurations
- **@workspace/typescript-config** - Shared TypeScript configurations

## Prerequisites

Before running this project, make sure you have the following installed:

- Node.js (version 20 or higher)
- pnpm (version 8.14.1 or higher)
- PostgreSQL database (version 13 or higher)
- Redis (version 5.0 or higher)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone git@github.com:dipesh-rumsan/trigger-datasource-packages-example.git
   cd trigger-datasource-packages-example
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the environment example files and configure them:

   ```bash
   cp apps/triggers/.env.example apps/triggers/.env
   cp apps/triggers/.env.example package/database/.env
   ```

   Update the following configuration in the `.env` file:

   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=rahat-trigger

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # Application Configuration
   PORT=7800
   NODE_ENV=development
   FLOODS_API_KEY="key"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   pnpm --filter @lib/database db:generate

   # Run database migrations
   pnpm --filter @lib/database db:migrate

   # Seed the database with initial data
   pnpm --filter @lib/database db:seed
   ```

   The seed script will populate the database with:
   - Initial settings and configurations
   - Sample trigger categories
   - Sample data sources
   - Sample trigger conditions

5. **Build all packages**

   Build packages in the correct order (dependencies first):

   ```bash
   # Build all packages and applications
   pnpm build

   # Or build specific packages
   pnpm --filter @lib/database build
   pnpm --filter @lib/core build
   pnpm --filter @lib/dhm-adapter build
   pnpm --filter @lib/glofas-adapter build
   pnpm --filter rahat-triggers build
   ```

6. **Start the development server**

   ```bash
   # Start all apps in development mode
   pnpm dev

   # Or start specific app
   pnpm --filter rahat-triggers dev
   ```

The triggers application will be available as a microservice at `http://localhost:7800`.

## Development Commands

### Building

```bash
# Build all packages and apps
pnpm build

# Build specific packages (in dependency order)
pnpm --filter @lib/database build
pnpm --filter @lib/core build
pnpm --filter @lib/dhm-adapter build
pnpm --filter @lib/glofas-adapter build

# Build the main application
pnpm --filter rahat-triggers build

# Clean build artifacts
pnpm turbo clean
```

### Development

```bash
# Start triggers app in development mode with hot reload
pnpm --filter rahat-triggers dev

# Start in debug mode
pnpm --filter rahat-triggers dev:debug

# Start in production mode
pnpm --filter rahat-triggers start:prod
```

### Database Operations

```bash
# Generate Prisma client
pnpm --filter @lib/database db:generate

# Create a new migration
pnpm --filter @lib/database db:migrate

# Deploy migrations to production
pnpm --filter @lib/database db:deploy

# Seed the database
pnpm --filter @lib/database db:seed

# Open Prisma Studio (database GUI)
pnpm --filter @lib/database db:studio

# Reset database (⚠️ drops all data)
pnpm --filter @lib/database db:reset
```

### Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter rahat-triggers lint

# Format code
pnpm --filter rahat-triggers format
```

### Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
pnpm --filter rahat-triggers test

# Run tests in watch mode
pnpm --filter rahat-triggers test:watch

# Run tests with coverage
pnpm --filter rahat-triggers test:cov
```

## Architecture

The project follows a clean, modular architecture with clear separation of concerns:

### Data Flow

```
External Sources (DHM/GLOFAS/GFH)
  ↓
Adapters (@lib/dhm-adapter, @lib/glofas-adapter, @lib/gfh-adapter)
  ↓ fetch() → Result<Indicator[]>
Health Monitoring (tracks execution, errors, response times)
  ↓
Standardized Observations (Indicator type)
  ↓
Database (PostgreSQL via Prisma)
  ↓
Trigger Evaluation (conditions, thresholds, rules)
  ↓
Actions (notifications, webhooks, etc.)
```

### Layer Architecture

- **Adapter Layer**: External data source integration with health monitoring
- **Service Layer**: Business logic for triggers, sources, and processing
- **Data Layer**: Prisma ORM with PostgreSQL for persistence, Redis for caching
- **Scheduling Layer**: NestJS Schedule for cron jobs
- **Queue Layer**: Bull/Redis for background job processing
