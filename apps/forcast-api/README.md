# Mock API - GLOFAS & GFH Data Simulator

A NestJS-based mock API server that simulates external data sources (GLOFAS, GFH, DHM) for testing and development purposes. This mock server eliminates the need to call real external APIs during development and testing, providing fast, reliable, and predictable responses.

## 🎯 Overview

The Mock API is built with NestJS and provides mock endpoints that replicate the behavior of external flood forecasting systems. It uses the `mock` database schema to store and serve test data, allowing developers to test trigger systems without depending on external API availability, rate limits, or network connectivity.

## 🚀 Purpose

**Why Mock API?**

Instead of calling real external APIs during development/testing:

- ❌ **Real APIs**: Slow, rate-limited, require authentication, unstable
- ✅ **Mock API**: Fast, unlimited calls, no auth needed, always available

This mock server enables:

- 🧪 **Isolated Testing**: Test without external dependencies
- ⚡ **Fast Development**: No network latency or API delays
- 🎭 **Scenario Simulation**: Test edge cases (high floods, API failures, etc.)
- 💰 **Cost Savings**: No API usage costs or rate limit concerns

## ✨ Features

- **Mock Forecast Endpoints**: Simulates GLOFAS and GFH flood forecast APIs
- **Mock Trigger Management**: CRUD operations for testing trigger workflows
- **Database Integration**: Uses `@lib/database` with `mock` schema
- **Swagger Documentation**: Interactive API documentation at `/swagger`
- **Winston Logging**: Structured logging for debugging
- **CORS Enabled**: Cross-origin requests supported

## 📁 Project Structure

```text
src/
├── app.controller.ts              # Main application controller
├── app.module.ts                  # Root module with database & HTTP setup
├── app.service.ts                 # Application service
├── main.ts                        # Bootstrap file (port: 3005)
├── all-exceptions.filter.ts       # Global exception handler
├── helpers/
│   └── winston.logger.ts          # Winston logger configuration
├── forecast/
│   ├── forecast.controller.ts     # Mock forecast endpoints (GLOFAS, GFH)
│   ├── forecast.service.ts        # Forecast data service
│   └── forecast.module.ts         # Forecast module
├── types/                         # TypeScript type definitions
└── utils/                         # Utility functions
docs/
├── local-setup.md                 # Local development setup guide
└── deployment.md                  # Deployment and CI/CD guide
```

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

| Document                           | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| [Local Setup](docs/local-setup.md) | Step-by-step guide for local development                 |
| [Deployment](docs/deployment.md)   | CI/CD pipeline, Docker images, and production deployment |

## 🛠️ Environment Configuration

Copy the environment example file and update the values:

```bash
cp .env.example .env
```

Update the `.env` file:

```bash
# Database Configuration (uses mock schema)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rahat_triggers

# Application Configuration
PORT=3005
NODE_ENV=development

# Optional: Direct DATABASE_URL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rahat_triggers?schema=mock
```

**Note:** The mock API uses the same database as the triggers app but operates in the `mock` schema for data isolation.

## 📦 Installation & Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Setup Database

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
pnpm --filter @lib/database db:generate

# Run migrations
pnpm --filter @lib/database db:migrate

# Optional: Seed mock data
pnpm --filter @lib/database seed
```

### 3. Build the Package

```bash
# Build mock-api
pnpm --filter mock-api build

# Or build all packages
pnpm build
```

## 🚀 Running the Application

### Development Mode

```bash
# From monorepo root
pnpm --filter mock-api dev

# Or from app directory
cd apps/mock-api
pnpm dev
```

The server will start at: **`http://localhost:3005`**

### Code Quality

```bash
# Run ESLint
pnpm lint

# Format code with Prettier
pnpm format
```

## API Endpoints

The application provides the following main endpoints:

### Health Check

- `GET /v1` - Basic health check endpoint
- `GET /v1/health` - Detailed health status

## API Documentation

When the application is running, you can access the interactive Swagger documentation at:

```
http://localhost:8000/swagger
```

The Swagger UI provides detailed information about all available endpoints, request/response schemas, and allows you to test the API directly from the browser.

## Database Integration

The application uses the shared `@lib/database` package which provides:

- **Prisma ORM Integration**: Type-safe database operations
- **Connection Management**: Automatic database connection handling
- **Exception Handling**: Comprehensive error handling for database operations
- **Migration Support**: Database schema migrations

The database configuration is handled automatically through environment variables, supporting both direct DATABASE_URL and individual connection parameters.

## Error Handling

The application includes comprehensive error handling:

- **Global Exception Filter**: Catches and formats all unhandled exceptions
- **Prisma Exception Filter**: Specifically handles database-related errors
- **Validation Errors**: Automatic validation of request data
- **Structured Error Responses**: Consistent error response format

## Development Workflow

1. **Start the database**: Ensure PostgreSQL is running
2. **Set up environment**: Configure your `.env` file
3. **Install dependencies**: Run `pnpm install` from the root
4. **Generate Prisma client**: Run `pnpm --filter @lib/database db:generate`
5. **Run migrations**: Run `pnpm --filter @lib/database db:migrate`
6. **Start development server**: Run `pnpm dev`
