import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllExceptionsFilter } from './utils/all-exceptions.filter';
import { PrismaClientExceptionFilter } from '@lib/database';
import { setupProcessHandlers } from './utils/global-filters.filter';

const logger = new Logger('Bootstrap');

export async function bootstrap() {
  setupProcessHandlers(logger);

  try {
    const PORT: number = process.env.PORT ? Number(process.env.PORT) : 7080;

    logger.log('Starting microservice initialization...');

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD,
          retryDelay: 3000,
          retryAttempts: 50,
        },
      },
    );

    // app.useGlobalPipes(
    //   new ValidationPipe({
    //     whitelist: true,
    //     transform: true,
    //     transformOptions: { enableImplicitConversion: true },
    //   }),
    // );

    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new PrismaClientExceptionFilter(),
    );

    await app.listen();

    logger.log(`🚀 Microservice is running on: http://localhost:${PORT}`);
    logger.log('Microservice is ready to accept connections');
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      logger.error(
        `❌ Failed to connect to Redis at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      );
      logger.error(
        'Please ensure Redis is running and accessible at the configured host and port.',
      );
    } else if (error.name === 'PrismaClientInitializationError') {
      logger.error('❌ Failed to connect to database');
      logger.error(
        'Please ensure the database is running and the connection string is correct.',
      );
      logger.error(`Error details: ${error.message}`);
    } else {
      logger.error(`❌ Failed to start microservice: ${error.message}`);
      logger.error(error.stack);
    }

    logger.error('Application will exit due to startup failure.');
    // process.exit(1);
  }
}

// Only call bootstrap if not in test environment
if (process.env.NODE_ENV !== 'test' && !globalThis.jestTestRun) {
  bootstrap();
}
