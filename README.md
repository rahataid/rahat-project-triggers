[![Coverage Status](https://coveralls.io/repos/github/rahataid/rahat-project-triggers/badge.svg?branch=main)](https://coveralls.io/github/rahataid/rahat-project-triggers?branch=main)

# Rahat Triggers - Anticipatory Action Platform
A decentralized platform for managing anticipatory action projects to enhance community resilience against climate shocks.

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Services](#services)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Development Guide](#development-guide)

## Project Overview
Rahat ("Relief" in Nepali) is a blockchain-based financial inclusion platform designed to empower vulnerable communities through anticipatory action (AA) projects. This trigger management system enables:

- 📆 Activity Management: Plan, organize, and track AA project activities
- 🚨 Trigger Modules: Configure hazard indicators and automated responses
- 🌍 Multi-source Forecasting: Integrate data from DHM, NCWRM, GLOFAS, etc.
- 💸 Cash/Voucher Assistance: Manage beneficiary support programs

## Key Features
- Microservices architecture with Redis-based communication
- Real-time trigger monitoring and response system
- Multi-agency forecasting data aggregation
- Blockchain-backed transaction transparency
- Automated workflow management
- Role-based access control

## Architecture
**Core Components:**
- **Redis Server**: Central message broker for inter-service communication
- **NestJS Microservices**: Independently deployable services
- **BullMQ**: Queue management for background jobs
- **Config Module**: Centralized environment configuration
- **Event Emitter**: Cross-service event management

## Services
| Service | Description |
|---------|-------------|
| Activity Management | Manages project timelines, tasks, and resource allocation |
| Trigger Engine | Processes hazard indicators and initiates predefined responses |
| Forecasting Integrator | Aggregates data from multiple meteorological sources |
| Communication Hub | Handles notifications and alerts distribution |
| Beneficiary Management | Maintains vulnerable community member records |

## Installation

### Prerequisites
- Node.js v20+
- Redis Server 6+
- pnpm 8+

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
   pnpm --filter triggers build
   ```

6. **Start the development server**

   ```bash
   # Start all apps in development mode
   pnpm dev

   # Or start specific app
   pnpm --filter triggers dev
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
pnpm --filter triggers build

# Clean build artifacts
pnpm turbo clean
```

### Development

```bash
# Start triggers app in development mode with hot reload
pnpm --filter triggers dev

# Start in debug mode
pnpm --filter triggers dev:debug

# Start in production mode
pnpm --filter triggers start:prod
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
pnpm --filter triggers lint

# Format code
pnpm --filter triggers format
```

### Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
pnpm --filter triggers test

# Run tests in watch mode
pnpm --filter triggers test:watch

# Run tests with coverage
pnpm --filter triggers test:cov
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
