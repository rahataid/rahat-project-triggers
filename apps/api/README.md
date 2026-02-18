# NestJs API Seed

The application is NestJS API Seed. This application provides RESTful APIs for managing operations and integrates with the shared database package for data persistence.

## Overview

The API application is built with NestJS and provides a robust API layer for handling various trigger operations. It includes comprehensive error handling, logging, API documentation, and database integration through the shared database package.

## Features

- **RESTful API**: Well-structured REST endpoints for trigger operations
- **Database Integration**: Uses the shared `@lib/database` package for data operations
- **Exception Handling**: Global exception filters for database and application errors
- **API Documentation**: Auto-generated Swagger documentation
- **Logging**: Structured logging with Winston integration
- **Validation**: Request validation using class-validator
- **CORS Support**: Cross-origin resource sharing enabled
- **Development Tools**: Hot reload and debugging support

## Project Structure

```
src/
├── app.controller.ts       # Main application controller
├── app.module.ts          # Root application module
├── app.service.ts         # Main application service
├── main.ts               # Application bootstrap file
├── all-exceptions.filter.ts  # Global exception filter
├── helpers/
│   └── winston.logger.ts  # Winston logger configuration
└── source-data/
    ├── source-data.controller.ts  # Source data API endpoints
    ├── source-data.module.ts      # Source data module
    └── source-data.service.ts     # Source data business logic
```

## Environment Configuration

The application requires environment variables to be configured. Copy the example file and update the values:

```bash
cp .env.example .env
```

The application supports both direct DATABASE_URL configuration and individual database parameters. See the `.env.example` file for all available configuration options.

## Available Scripts

### Development

```bash
# Start in development mode with hot reload
pnpm dev

# Start in debug mode
pnpm start:debug

# Build the application
pnpm build

# Start in production mode
pnpm start:prod
```

### Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run end-to-end tests
pnpm test:e2e

# Generate test coverage report
pnpm test:cov
```

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
http://localhost:3000/swagger
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

## Logging

The application uses Winston for structured logging with different log levels:

- **Development**: Detailed logs with query information
- **Production**: Optimized logging for performance
- **Error Tracking**: Comprehensive error logging with context

## Development Workflow

1. **Start the database**: Ensure PostgreSQL is running
2. **Set up environment**: Configure your `.env` file
3. **Install dependencies**: Run `pnpm install` from the root
4. **Generate Prisma client**: Run `pnpm --filter @lib/database db:generate`
5. **Run migrations**: Run `pnpm --filter @lib/database db:migrate`
6. **Start development server**: Run `pnpm dev`

## Configuration

The application can be configured through environment variables:

- **Database Configuration**: Connection details for PostgreSQL
- **Application Settings**: Port, environment mode, etc.
- **Logging Configuration**: Log levels and output formats

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the PORT environment variable
2. **Database Connection Failed**: Verify database configuration and ensure PostgreSQL is running
3. **Build Errors**: Clear node_modules and reinstall dependencies
4. **Migration Issues**: Check database permissions and connection string

### Debug Mode

To run the application in debug mode:

```bash
pnpm start:debug
```

This enables the Node.js debugger and provides detailed logging for troubleshooting issues.

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure production database settings
3. Build the application: `pnpm build`
4. Start with: `pnpm start:prod`

The application includes production-optimized logging and error handling when running in production mode.
