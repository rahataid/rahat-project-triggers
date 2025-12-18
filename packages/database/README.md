# Database Package

A shared database package that provides Prisma ORM integration and NestJS modules for database operations. This package is designed to be reusable across multiple applications in the monorepo.

## Overview

The database package encapsulates all database-related functionality including Prisma client configuration, NestJS integration modules, exception handling, and database utilities. It provides a clean abstraction layer for database operations with comprehensive error handling and logging.

## Features

- **Prisma ORM Integration**: Type-safe database operations with auto-generated client
- **NestJS Module Integration**: Ready-to-use NestJS modules for dependency injection
- **Exception Handling**: Comprehensive Prisma error handling with user-friendly messages
- **Dynamic Configuration**: Supports both DATABASE_URL and individual connection parameters
- **Logging Integration**: Built-in logging with NestJS Logger
- **Migration Support**: Database schema migrations and generation
- **Type Safety**: Full TypeScript support with generated types

## Package Structure

```
src/
├── client.ts                    # Prisma client configuration
├── utils.ts                     # Database utilities
└── nestjs/
    ├── index.ts                 # NestJS exports
    ├── prisma.constants.ts      # Constants for dependency injection
    ├── prisma.module.ts         # Main Prisma module
    ├── prisma.service.ts        # Prisma service implementation
    ├── prisma-client-exception.filter.ts  # Exception filter
    └── interfaces/
        └── prisma-module-options.interface.ts  # Type definitions

prisma/
├── schema/                      # Prisma schema files
├── seeds/                       # Database seed files
└── seed-db.sh                   # Seed runner script

scripts/
└── build.js                     # Custom build script
```

## Installation

This package is part of the monorepo and is automatically available to other packages. To use it in your NestJS application:

```typescript
import { PrismaModule, PrismaService } from '@lib/database';
```

## Usage

### Basic Setup

The simplest way to use the database package in your NestJS application:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@lib/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule.forRootWithConfig({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### Using PrismaService

Inject the PrismaService into your services:

```typescript
// your.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@lib/database';

@Injectable()
export class YourService {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers() {
    return this.prisma.user.findMany();
  }

  async createUser(data: { email: string; name: string }) {
    return this.prisma.user.create({ data });
  }
}
```

### Advanced Configuration

For more control over the Prisma configuration:

```typescript
// app.module.ts
import { PrismaModule } from '@lib/database';

@Module({
  imports: [
    PrismaModule.forRootAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => ({
        explicitConnect: true,
        prismaOptions: {
          datasources: {
            db: {
              url: configService.get('DATABASE_URL'),
            },
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Configuration

The package supports flexible database configuration through environment variables:

### Option 1: Direct DATABASE_URL

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name?schema=public
```

### Option 2: Individual Parameters

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=username
DB_PASSWORD=password
DB_NAME=database_name
```

The package automatically prioritizes DATABASE_URL if provided, otherwise constructs the connection string from individual parameters.

## Available Methods

### PrismaModule Methods

- **`forRootWithConfig(options?)`**: Automatic configuration with environment variables
- **`forRoot(options)`**: Basic configuration with static options
- **`forRootAsync(options)`**: Advanced async configuration with factory functions

### PrismaService Methods

The PrismaService extends the generated Prisma client, providing all standard Prisma operations plus:

- **Connection Management**: Automatic connection handling
- **Logging**: Structured logging for database operations
- **Error Handling**: Enhanced error reporting

## Exception Handling

The package includes a comprehensive exception filter that handles Prisma errors:

### Supported Error Codes

- **P2000**: Value too long → 400 Bad Request
- **P2001**: Record not found in where condition → 400 Bad Request
- **P2002**: Unique constraint violation → 409 Conflict
- **P2003**: Foreign key constraint violation → 400 Bad Request
- **P2004**: Database constraint violation → 400 Bad Request
- **P2025**: Record not found for operation → 404 Not Found
- **P2034**: Transaction conflict/deadlock → 409 Conflict

### Using the Exception Filter

The exception filter can be registered globally in your application:

```typescript
// main.ts
import { PrismaClientExceptionFilter } from '@lib/database';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  await app.listen(3000);
}
```

## Database Operations

### Available Scripts

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations in development
pnpm db:migrate

# Deploy migrations to production
pnpm db:deploy

# Generate client without engine (production)
pnpm db:generate:prod

# Seed database from source
pnpm db:seed

# Seed database from dist (after build)
pnpm db:seed:dist
```

### Database Seeding

The package includes a seeding system to populate the database with initial data:

#### Seed Files Location

- **Source**: `prisma/seeds/*.ts` - TypeScript seed files
- **After Build**: `dist/prisma/seeds/*.ts` - Copied to dist directory

#### Seed File Structure

Each seed file should:

1. Import Prisma client from `../../generated/prisma`
2. Import types from `../../index` (package types)
3. Execute async operations with proper error handling
4. Disconnect Prisma client in finally block

Example seed file:

```typescript
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

const main = async () => {
  await prisma.yourModel.create({
    data: {
      /* your data */
    },
  });
};

main()
  .catch((error) => {
    console.error('Error during seeding:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### Running Seeds

**From source (development):**

```bash
pnpm db:seed
# or directly
./prisma/seed-db.sh
```

**From dist (production/after build):**

```bash
pnpm db:seed:dist
# or directly
./dist/prisma/seed-db.sh
```

#### Build Process

The build process uses a dedicated build script (`scripts/build.js`) that automatically:

1. Compiles TypeScript source to JavaScript
2. Copies Prisma generated client to `dist/generated/`
3. Copies seed files to `dist/prisma/seeds/` (as TypeScript)
4. Copies seed script to `dist/prisma/seed-db.sh`
5. Sets executable permissions on the seed script

The build script provides clear visual feedback for each step and ensures all dependencies are properly copied.

The import paths in seed files work correctly from both locations:

- From `prisma/seeds/`: `../../generated/prisma` → `generated/prisma`
- From `dist/prisma/seeds/`: `../../generated/prisma` → `dist/generated/prisma`

#### Adding New Seeds

1. Create a new `.ts` file in `prisma/seeds/`
2. Use the seed file structure shown above
3. The `seed-db.sh` script will automatically run all `.ts` files in the seeds directory

### Schema Management

The package includes Prisma schema files in the `prisma/` directory:

- **schema.prisma**: Main database schema
- **migrations/**: Database migration files

## Development Workflow

1. **Modify Schema**: Update the Prisma schema files
2. **Generate Migration**: Run `pnpm db:migrate` to create migration
3. **Generate Client**: Run `pnpm db:generate` to update the client
4. **Build Package**: Run `pnpm build` to compile TypeScript
5. **Use in Apps**: Import and use in your NestJS applications

## Type Safety

The package provides full TypeScript support with:

- **Generated Types**: Auto-generated types from Prisma schema
- **Type-safe Queries**: Compile-time query validation
- **IntelliSense Support**: Full IDE support for database operations
- **Interface Definitions**: Well-defined interfaces for all options

## Logging

The package includes comprehensive logging:

- **Connection Events**: Database connection status
- **Error Logging**: Detailed error information with context
- **Query Logging**: Optional query logging for debugging
- **Security**: Automatic credential masking in logs

## Dependencies

### Runtime Dependencies

- **@prisma/client**: Prisma ORM client
- **prisma**: Prisma CLI and schema tools
- **@nestjs/common**: NestJS core functionality
- **@nestjs/config**: Configuration management

### Peer Dependencies

- **@nestjs/core**: NestJS application core
- **reflect-metadata**: Metadata reflection
- **rxjs**: Reactive extensions

## Best Practices

1. **Use Global Module**: Register PrismaModule as global for easy access
2. **Environment Configuration**: Use environment variables for database configuration
3. **Error Handling**: Always use the provided exception filter
4. **Connection Management**: Let the service handle connections automatically
5. **Type Safety**: Leverage TypeScript for compile-time safety

## Troubleshooting

### Common Issues

1. **Client Generation Failed**: Run `pnpm db:generate` to regenerate the client
2. **Migration Errors**: Check database permissions and connection string
3. **Type Errors**: Ensure the client is generated after schema changes
4. **Connection Issues**: Verify database configuration and network connectivity

### Debug Mode

Enable debug logging by setting the log level in your Prisma configuration:

```typescript
prismaOptions: {
  log: ['query', 'info', 'warn', 'error'],
}
```

## Production Considerations

- Use `pnpm db:generate:prod` for production builds
- Set appropriate connection pool sizes
- Enable query logging only for debugging
- Use environment-specific database configurations
- Implement proper backup and recovery procedures

## Contributing

When contributing to the database package:

1. Update schema files in the `prisma/` directory
2. Generate and test migrations
3. Update TypeScript interfaces if needed
4. Add tests for new functionality
5. Update documentation

The database package is designed to be a robust, reusable foundation for all database operations in the monorepo.
