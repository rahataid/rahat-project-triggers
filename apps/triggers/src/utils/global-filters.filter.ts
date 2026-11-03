import { INestApplicationContext, Logger } from '@nestjs/common';

export function setupProcessHandlers(
  logger: Logger,
  app?: INestApplicationContext,
) {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    try {
      logger.error(
        `Unhandled Promise Rejection: ${reason?.message || reason}`,
        reason?.stack,
      );

      try {
        logger.error(`Promise: ${JSON.stringify(promise)}`);
      } catch (stringifyError) {
        logger.error(`Promise: [Circular or non-serializable object]`);
      }
    } catch (logError) {
      // Fallback to console if logger fails
      console.error('Logger failed in unhandledRejection handler:', logError);
      console.error(
        `Unhandled Promise Rejection: ${reason?.message || reason}`,
      );
    }
  });

  process.on('uncaughtException', (error: Error) => {
    try {
      logger.error(`Uncaught Exception: ${error.message}`, error.stack);
      logger.error(
        'Application encountered an uncaught exception. Shutting down gracefully...',
      );
    } catch (logError) {
      // Fallback to console if logger fails
      console.error('Logger failed in uncaughtException handler:', logError);
      console.error(`Uncaught Exception: ${error.message}`);
    }
  });

  const shutdown = async (signal: string) => {
    try {
      logger.warn(`${signal} signal received: closing application gracefully`);
    } catch (logError) {
      console.warn(`Logger failed in ${signal} handler:`, logError);
    }

    try {
      await app?.close();
    } catch (closeError) {
      logger.error('Error while closing application', closeError as Error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
