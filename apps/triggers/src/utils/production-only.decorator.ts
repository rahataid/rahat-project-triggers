import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('ProductionOnly');

/**
 * Decorator that wraps a method to only execute in production environment.
 * Useful for preventing bootstrap sync operations during local development.
 *
 * The decorator looks for a `configService` property on the class instance
 * to use NestJS ConfigService. Falls back to process.env if not available.
 *
 * @param options - Optional configuration
 * @param options.envKey - Environment variable to check (default: 'NODE_ENV')
 * @param options.productionValues - Array of values considered as production (default: ['production'])
 * @param options.logSkipped - Whether to log when method execution is skipped (default: true)
 *
 * @example
 * ```
 * export class MyService implements OnApplicationBootstrap {
 *   constructor(private readonly configService: ConfigService) {}
 *
 *   @ProductionOnly()
 *   onApplicationBootstrap() {
 *     this.syncData();
 *   }
 *
 *   // Or with custom options
 *   @ProductionOnly({ productionValues: ['production', 'staging'] })
 *   async someMethod() {
 *     // ...
 *   }
 * }
 * ```
 */
export function ProductionOnly(options?: {
  envKey?: string;
  productionValues?: string[];
  logSkipped?: boolean;
}): MethodDecorator {
  const {
    envKey = 'NODE_ENV',
    productionValues = ['production'],
    logSkipped = true,
  } = options || {};

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = function (...args: any[]) {
      const configService = (this as any).configService as
        | ConfigService
        | undefined;
      const currentEnv =
        configService?.get<string>(envKey) ?? process.env[envKey];
      const isProduction = productionValues.includes(currentEnv || '');

      if (!isProduction) {
        if (logSkipped) {
          logger.log(
            `Skipping ${className}.${String(propertyKey)}() - Not in production (${envKey}=${currentEnv || 'undefined'})`,
          );
        }
        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
