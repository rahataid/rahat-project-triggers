import { Logger } from '@nestjs/common';

export function setupProcessHandlers(logger: Logger) {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error(
      `Unhandled Promise Rejection: ${reason?.message || reason}`,
      reason?.stack,
    );
    logger.error(`Promise: ${JSON.stringify(promise)}`);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught Exception: ${error.message}`, error.stack);
    logger.error(
      'Application encountered an uncaught exception. Shutting down gracefully...',
    );
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.warn('SIGTERM signal received: closing application gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.warn('SIGINT signal received: closing application gracefully');
    process.exit(0);
  });
}
