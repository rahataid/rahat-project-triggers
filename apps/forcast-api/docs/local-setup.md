# Local Setup Guide

## Prerequisites

- Node.js >= 18
- pnpm 8.14.1+
- PostgreSQL database

## Setup Steps

### 1. Install Dependencies

From the root of the monorepo:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example env file:

```bash
cp apps/forcast-api/.env.example apps/forcast-api/.env
```

Update the values in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rahat_triggers
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rahat_triggers
PORT=8000
NODE_ENV=development
```

Also set up the database package env:

```bash
cp packages/database/.env.example packages/database/.env
```

Make sure `DATABASE_URL` in `packages/database/.env` matches your database connection.

### 3. Setup Database

Generate Prisma client:

```bash
pnpm --filter @lib/database db:generate
```

Run migrations:

```bash
pnpm --filter @lib/database db:migrate
```

Seed the database (optional):

```bash
pnpm --filter @lib/database seed
```

### 4. Start Development Server

From the root:

```bash
pnpm --filter forcast-api dev
```

Or build and run:

```bash
pnpm build:forcast
pnpm --filter forcast-api start:prod
```

The API runs on `http://localhost:8000` by default.

## Database Schemas

The project uses two PostgreSQL schemas:

- `public` - main application data
- `mock` - mock data for testing

## Useful Commands

| Command                                   | Description                      |
| ----------------------------------------- | -------------------------------- |
| `pnpm --filter forcast-api dev`           | Start dev server with hot reload |
| `pnpm --filter @lib/database db:generate` | Generate Prisma client           |
| `pnpm --filter @lib/database db:migrate`  | Run database migrations          |
| `pnpm --filter forcast-api lint`          | Run linter                       |
| `pnpm --filter forcast-api test`          | Run tests                        |
