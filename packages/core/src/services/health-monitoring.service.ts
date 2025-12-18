import { Injectable, Logger } from '@nestjs/common';
import {
  AdapterHealthConfig,
  AdapterHealthStatus,
  ExecutionReport,
  ItemError,
  HealthCacheInterface,
} from '../types/health.type';

@Injectable()
export class HealthMonitoringService {
  private readonly logger = new Logger(HealthMonitoringService.name);
  static configs = new Map<string, AdapterHealthConfig>();
  static healthStatuses = new Map<string, AdapterHealthStatus>();
  private readonly MAX_ERRORS_PER_ADAPTER = 50;
  static cacheService?: HealthCacheInterface;

  static setCacheService(service: HealthCacheInterface): void {
    HealthMonitoringService.cacheService = service;
  }

  registerAdapter(config: AdapterHealthConfig): void {
    this.logger.log(`Registering adapter: ${config.adapterId}`);
    HealthMonitoringService.configs.set(config.adapterId, config);

    if (!HealthMonitoringService.healthStatuses.has(config.adapterId)) {
      HealthMonitoringService.healthStatuses.set(config.adapterId, {
        adapterId: config.adapterId,
        name: config.name,
        sourceUrl: config.sourceUrl,
        currentStatus: 'HEALTHY',
        lastSuccessAt: null,
        lastFailureAt: null,
        last_checked: null,
        fetch_frequency_minutes: config.fetchIntervalMinutes,
        response_time_ms: 0,
        validity: 'VALID',
        successCount: 0,
        failureCount: 0,
        partialSuccessCount: 0,
        averageDuration: 0,
        errors: [],
        itemStatistics: {},
      });
    }

    if (HealthMonitoringService.cacheService) {
      HealthMonitoringService.cacheService
        .setAdapterConfig(config)
        .catch((error: any) => {
          this.logger.error(
            `Failed to persist adapter config for ${config.adapterId}:`,
            error,
          );
        });
    }
  }

  async recordExecution(report: ExecutionReport): Promise<void> {
    const status = HealthMonitoringService.healthStatuses.get(report.adapterId);
    if (!status) {
      this.logger.warn(
        `Adapter ${report.adapterId} not registered, skipping health recording`,
      );
      return;
    }

    this.updateExecutionMetrics(status, report);
    this.updateItemStatistics(status, report);
    this.updateErrorLog(status, report);
    this.calculateHealthStatus(report.adapterId, status);

    this.logger.debug(
      `Recorded execution for ${report.adapterId}: ${report.status} (${report.successfulItems}/${report.totalItems} items)`,
    );

    await this.persistToCache(report.adapterId, status, report);
  }

  getHealthStatus(adapterId: string): AdapterHealthStatus | null {
    return HealthMonitoringService.healthStatuses.get(adapterId) || null;
  }

  getAllHealthStatuses(): AdapterHealthStatus[] {
    return Array.from(HealthMonitoringService.healthStatuses.values());
  }

  getItemLevelErrors(adapterId: string, itemId?: string): ItemError[] | null {
    const status = HealthMonitoringService.healthStatuses.get(adapterId);
    if (!status) {
      return null;
    }

    if (itemId) {
      return status.errors.filter((error) => error.itemId === itemId);
    }

    return status.errors;
  }

  private updateExecutionMetrics(
    status: AdapterHealthStatus,
    report: ExecutionReport,
  ): void {
    status.last_checked = report.timestamp;
    status.response_time_ms = report.duration;
    status.averageDuration = this.calculateMovingAverage(
      status.averageDuration,
      report.duration,
      this.getTotalExecutionCount(status),
    );

    if (report.status === 'success') {
      status.successCount++;
      status.lastSuccessAt = report.timestamp;
    } else if (report.status === 'partial') {
      status.partialSuccessCount++;
      status.lastSuccessAt = report.timestamp;

      const successRate = report.successfulItems / report.totalItems;
      if (successRate < 0.5) {
        this.logger.warn(
          `${report.adapterId}: Low success rate ${(successRate * 100).toFixed(1)}% (${report.successfulItems}/${report.totalItems} items)`,
        );
      }
    } else {
      status.failureCount++;
      status.lastFailureAt = report.timestamp;
    }
  }

  private updateItemStatistics(
    status: AdapterHealthStatus,
    report: ExecutionReport,
  ): void {
    for (const error of report.itemErrors) {
      if (!status.itemStatistics[error.itemId]) {
        status.itemStatistics[error.itemId] = {
          successCount: 0,
          failureCount: 0,
        };
      }
      const itemStat = status.itemStatistics[error.itemId];
      if (itemStat) {
        itemStat.failureCount++;
        itemStat.lastError = error;
      }
    }
  }

  private updateErrorLog(
    status: AdapterHealthStatus,
    report: ExecutionReport,
  ): void {
    for (const error of report.itemErrors) {
      status.errors.unshift(error);
    }

    if (report.globalError) {
      status.errors.unshift({
        itemId: 'GLOBAL',
        stage: 'fetch',
        code: report.globalError.code,
        message: report.globalError.message,
        timestamp: report.timestamp.toISOString(),
      });
    }

    if (status.errors.length > this.MAX_ERRORS_PER_ADAPTER) {
      status.errors = status.errors.slice(0, this.MAX_ERRORS_PER_ADAPTER);
    }
  }

  private calculateHealthStatus(
    adapterId: string,
    status: AdapterHealthStatus,
  ): void {
    const config = HealthMonitoringService.configs.get(adapterId);

    if (!config || !status.lastSuccessAt) {
      this.logger.fatal(
        `Adapter ${adapterId} not found. Rolling back as 'EXPIRED' Status.`,
      );
      status.currentStatus = 'UNHEALTHY';
      status.validity = 'EXPIRED';
      return;
    }

    const now = new Date();
    const timeSinceLastSuccess = now.getTime() - status.lastSuccessAt.getTime();
    const fetchIntervalMs = config.fetchIntervalMinutes * 60 * 1000;
    const staleThresholdMs = fetchIntervalMs * config.staleThresholdMultiplier;
    const expiredThresholdMs = fetchIntervalMs * 2;

    if (timeSinceLastSuccess < fetchIntervalMs) {
      status.validity = 'VALID';
    } else if (timeSinceLastSuccess < staleThresholdMs) {
      status.validity = 'STALE';
    } else {
      status.validity = 'EXPIRED';
    }

    if (timeSinceLastSuccess < staleThresholdMs) {
      status.currentStatus = 'HEALTHY';
    } else if (timeSinceLastSuccess < expiredThresholdMs) {
      status.currentStatus = 'DEGRADED';
    } else {
      status.currentStatus = 'UNHEALTHY';
    }
  }

  private calculateMovingAverage(
    currentAverage: number,
    newValue: number,
    totalCount: number,
  ): number {
    if (totalCount === 0) {
      return newValue;
    }
    return (currentAverage * totalCount + newValue) / (totalCount + 1);
  }

  private getTotalExecutionCount(status: AdapterHealthStatus): number {
    return (
      status.successCount + status.failureCount + status.partialSuccessCount
    );
  }

  private async persistToCache(
    adapterId: string,
    status: AdapterHealthStatus,
    report: ExecutionReport,
  ): Promise<void> {
    if (!HealthMonitoringService.cacheService) {
      this.logger.warn(`No cache service registered, skipping persistence`);
      return;
    }

    try {
      await HealthMonitoringService.cacheService.updateHealthStatus(
        adapterId,
        status,
      );

      for (const error of report.itemErrors) {
        await HealthMonitoringService.cacheService.recordItemError(
          adapterId,
          error,
        );
      }

      for (const [itemId, stats] of Object.entries(status.itemStatistics)) {
        await HealthMonitoringService.cacheService.updateItemStatistics(
          adapterId,
          itemId,
          stats,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to persist health data to cache for ${adapterId}:`,
        error,
      );
    }
  }
}
