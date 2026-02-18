import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('ProductionOnly');

export interface ProductionOnlyOptions {
  envKey?: string;
  productionValues?: string[];
  logSkipped?: boolean;
}

/**
 * Wrapper function to conditionally run bootstrap methods only in production.
 *
 * @param configService - NestJS ConfigService instance
 * @param fn - The function to run
 * @param methodName - Name of the method (for logging)
 * @param options - Optional configuration
 *
 * @example
 * ```
 * export class MyService implements OnApplicationBootstrap {
 *   constructor(private readonly configService: ConfigService) {}
 *
 *   onApplicationBootstrap() {
 *     runInProductionOnly(this.configService, () => this.syncData(), 'syncData');
 *     runInProductionOnly(this.configService, () => this.syncOtherData(), 'syncOtherData');
 *     // This one always runs:
 *     this.someOtherMethod();
 *   }
 * }
 * ```
 */
export function runInProductionOnly(
  configService: ConfigService,
  fn: () => void | Promise<void>,
  methodName?: string,
  options?: ProductionOnlyOptions,
): void | Promise<void> {
  const {
    envKey = 'NODE_ENV',
    productionValues = ['production'],
    logSkipped = true,
  } = options || {};

  const currentEnv = configService.get<string>(envKey);
  const isProduction = productionValues.includes(currentEnv || '');

  if (!isProduction) {
    if (logSkipped && methodName) {
      logger.log(
        `Skipping ${methodName}() - Not in production (${envKey}=${currentEnv || 'undefined'})`,
      );
    }
    return;
  }

  return fn();
}
