import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  AdapterHealthStatus,
  AdapterHealthConfig,
  ItemError,
  ItemStatistics,
  HealthCacheInterface,
  HealthStatus,
  HealthDataResult,
} from '../types/health.type';

@Injectable()
export class HealthCacheService implements HealthCacheInterface {
  private readonly logger = new Logger(HealthCacheService.name);
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private readonly ADAPTER_CONFIG_KEY = 'health:adapter:config';
  private readonly ADAPTER_STATUS_KEY = 'health:adapter:status';
  private readonly ADAPTER_ITEMS_KEY = 'health:adapter:items';
  private readonly ADAPTER_ERRORS_KEY = 'health:adapter:errors';
  private readonly TTL = 1200; // 20 minutes (longer than 15 min cron)

  async setAdapterConfig(config: AdapterHealthConfig): Promise<void> {
    const key = `${this.ADAPTER_CONFIG_KEY}:${config.adapterId}`;

    try {
      await this.redis.set(key, JSON.stringify(config));
      this.logger.debug(`Stored adapter config for ${config.adapterId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to cache adapter config for ${config.adapterId}:`,
        error,
      );
    }
  }

  async getAdapterConfig(
    adapterId: string,
  ): Promise<AdapterHealthConfig | null> {
    const key = `${this.ADAPTER_CONFIG_KEY}:${adapterId}`;

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error: any) {
      this.logger.error(
        `Failed to get adapter config for ${adapterId}:`,
        error,
      );
      return null;
    }
  }

  async updateHealthStatus(
    adapterId: string,
    status: AdapterHealthStatus,
  ): Promise<void> {
    const key = `${this.ADAPTER_STATUS_KEY}:${adapterId}`;
    try {
      await this.redis.setex(key, this.TTL, JSON.stringify(status));
      this.logger.debug(`Updated health status for ${adapterId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to update health status for ${adapterId}:`,
        error,
      );
    }
  }

  async getHealthStatus(
    adapterId: string,
  ): Promise<AdapterHealthStatus | null> {
    const key = `${this.ADAPTER_STATUS_KEY}:${adapterId}`;

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }

      const status = JSON.parse(data);
      if (status.lastSuccessAt) {
        status.lastSuccessAt = new Date(status.lastSuccessAt);
      }
      if (status.lastFailureAt) {
        status.lastFailureAt = new Date(status.lastFailureAt);
      }

      return status;
    } catch (error: any) {
      this.logger.error(`Failed to get health status for ${adapterId}:`, error);
      return null;
    }
  }

  async getAllHealthStatuses(): Promise<HealthDataResult> {
    try {
      const sources = await this.getAllSourcesHealth();
      const overallStatus = this.calculateOverallStatus(sources);

      const summary: HealthDataResult = {
        overall_status: overallStatus,
        last_updated: new Date().toISOString(),
        sources,
      };

      return summary;
    } catch (error: any) {
      this.logger.error('Failed to get all health statuses:', error);
      return {
        overall_status: 'UNHEALTHY',
        last_updated: new Date().toISOString(),
        sources: [],
      };
    }
  }

  async recordItemError(adapterId: string, error: ItemError): Promise<void> {
    const key = `${this.ADAPTER_ERRORS_KEY}:${adapterId}`;

    try {
      await this.redis.lpush(key, JSON.stringify(error));
      await this.redis.ltrim(key, 0, 49);
      await this.redis.expire(key, this.TTL);

      this.logger.debug(
        `Recorded item error for ${adapterId}, item ${error.itemId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to record item error for ${adapterId}:`, error);
    }
  }

  async getItemErrors(
    adapterId: string,
    itemId?: string,
  ): Promise<ItemError[]> {
    const key = `${this.ADAPTER_ERRORS_KEY}:${adapterId}`;

    try {
      const errors = await this.redis.lrange(key, 0, -1);
      const parsedErrors = errors.map((error: string) =>
        JSON.parse(error),
      ) as ItemError[];

      if (itemId) {
        return parsedErrors.filter(
          (error: ItemError) => error.itemId === itemId,
        );
      }

      return parsedErrors;
    } catch (error: any) {
      this.logger.error(`Failed to get item errors for ${adapterId}:`, error);
      return [];
    }
  }

  async updateItemStatistics(
    adapterId: string,
    itemId: string,
    stats: ItemStatistics,
  ): Promise<void> {
    const key = `${this.ADAPTER_ITEMS_KEY}:${adapterId}:${itemId}`;

    try {
      await this.redis.setex(key, this.TTL, JSON.stringify(stats));
    } catch (error: any) {
      this.logger.error(
        `Failed to update item statistics for ${adapterId}:${itemId}:`,
        error,
      );
    }
  }

  async getItemStatistics(
    adapterId: string,
    itemId: string,
  ): Promise<ItemStatistics | null> {
    const key = `${this.ADAPTER_ITEMS_KEY}:${adapterId}:${itemId}`;

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }

      const stats = JSON.parse(data);
      if (stats.lastError?.timestamp) {
        stats.lastError.timestamp = new Date(stats.lastError.timestamp);
      }

      return stats;
    } catch (error: any) {
      this.logger.error(
        `Failed to get item statistics for ${adapterId}:${itemId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all sources health data
   */
  async getAllSourcesHealth(): Promise<AdapterHealthStatus[]> {
    try {
      const pattern = `${this.ADAPTER_STATUS_KEY}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return [];
      }

      const pipeline = this.redis.pipeline();
      keys.forEach((key: string) => pipeline.get(key));

      const results = await pipeline.exec();

      return (results ?? [])
        .filter(([err, data]: [Error | null, unknown]) => !err && data)
        .map(([, data]: [Error | null, unknown]) => {
          const status = JSON.parse(data as string);
          if (status.lastSuccessAt) {
            status.lastSuccessAt = new Date(status.lastSuccessAt);
          }
          if (status.lastFailureAt) {
            status.lastFailureAt = new Date(status.lastFailureAt);
          }
          return status;
        })
        .sort((a: AdapterHealthStatus, b: AdapterHealthStatus) =>
          a.adapterId.localeCompare(b.adapterId),
        );
    } catch (error: any) {
      this.logger.error('Failed to get all source health:', error);
      return [];
    }
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallStatus(sources: AdapterHealthStatus[]): HealthStatus {
    if (sources.length === 0) return 'UNHEALTHY';

    const upCount = sources.filter((s) => s.currentStatus === 'HEALTHY').length;
    const downCount = sources.filter(
      (s) => s.currentStatus === 'UNHEALTHY',
    ).length;

    // All sources are UP
    if (upCount === sources.length) return 'HEALTHY';

    // More than half are DOWN
    if (downCount > sources.length / 2) return 'UNHEALTHY';

    // Some issues but not critical
    return 'DEGRADED';
  }
}
