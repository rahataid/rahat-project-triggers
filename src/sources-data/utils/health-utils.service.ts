import { Injectable, Logger } from '@nestjs/common';
import { HealthCacheService } from 'src/source/health-cache.service';
import { SourceStatus } from 'src/source/dto/health.type';

export interface HealthError {
  code: string;
  message: string;
  timestamp: string;
}

export interface HealthCheckResult {
  status: SourceStatus;
  successfulStations: number;
  totalStations: number;
  errors: HealthError[];
  duration: number;
}

export interface HealthCheckConfig {
  sourceId: string;
  name: string;
  sourceUrl: string;
  startTimestamp: Date;
}

@Injectable()
export class HealthUtilsService {
  private readonly logger = new Logger(HealthUtilsService.name);

  constructor(private readonly healthCacheService: HealthCacheService) {}

  /**
   * Create a standardized error object
   */
  createError(code: string, message: string): HealthError {
    return {
      code,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Determine overall health status based on success metrics
   */
  calculateHealthStatus(
    successfulStations: number,
    totalStations: number,
    hasErrors: boolean,
  ): SourceStatus {
    if (successfulStations === 0) return 'UNHEALTHY';
    if (successfulStations < totalStations || hasErrors) return 'DEGRADED';
    return 'HEALTHY';
  }

  /**
   * Handle settings validation - returns health data if settings are invalid
   */
  async validateSettings<T>(
    settings: T[] | undefined | null,
    config: HealthCheckConfig,
    settingsType: string,
  ): Promise<boolean> {
    if (!settings || settings.length === 0) {
      this.logger.warn(`${settingsType} settings not found or empty`);

      const healthData = await this.healthCacheService.createHealthData({
        sourceId: config.sourceId,
        name: config.name,
        sourceUrl: config.sourceUrl,
        status: 'UNHEALTHY',
        responseTimeMs: new Date().getTime() - config.startTimestamp.getTime(),
        errors: [
          this.createError(
            `${settingsType.toUpperCase()}_CONFIG_ERROR`,
            `${settingsType} settings not found or empty`,
          ),
        ],
      });

      await this.healthCacheService.setSourceHealth(
        config.sourceId,
        healthData,
      );
      return false;
    }
    return true;
  }

  /**
   * Create and store health data based on results
   */
  async storeHealthResult(
    config: HealthCheckConfig,
    result: HealthCheckResult,
  ): Promise<void> {
    const healthData = await this.healthCacheService.createHealthData({
      sourceId: config.sourceId,
      name: config.name,
      sourceUrl: config.sourceUrl,
      status: result.status,
      responseTimeMs: result.duration,
      errors: result.errors.length > 0 ? result.errors : null,
    });

    await this.healthCacheService.setSourceHealth(config.sourceId, healthData);

    this.logger.log(
      `${config.name} health data updated - ${result.successfulStations}/${result.totalStations} stations successful`,
    );
  }

  /**
   * Handle top-level errors and create error health data
   */
  async handleTopLevelError(
    config: HealthCheckConfig,
    error: any,
    errorCode: string,
  ): Promise<void> {
    const errorMessage = error?.response?.data?.message || error.message;
    this.logger.error(`Error in ${config.name}:`, errorMessage);

    const healthData = await this.healthCacheService.createHealthData({
      sourceId: config.sourceId,
      name: config.name,
      sourceUrl: config.sourceUrl,
      status: 'UNHEALTHY',
      responseTimeMs: new Date().getTime() - config.startTimestamp.getTime(),
      errors: [this.createError(errorCode, errorMessage)],
    });

    await this.healthCacheService.setSourceHealth(config.sourceId, healthData);
  }

  /**
   * Process multiple stations in parallel
   */
  async processStationsInParallel<T>(
    stations: T[],
    processor: (station: T, errors: HealthError[]) => Promise<boolean>,
  ): Promise<HealthCheckResult> {
    const startTime = new Date();
    const errors: HealthError[] = [];
    let successfulStations = 0;
    const totalStations = stations.length;

    const stationPromises = stations.map(async (station) => {
      try {
        const success = await processor(station, errors);
        if (success) {
          successfulStations++;
        }
        return success;
      } catch (error) {
        // Error should be handled by the processor
        return false;
      }
    });

    await Promise.allSettled(stationPromises);

    const duration = new Date().getTime() - startTime.getTime();
    const status = this.calculateHealthStatus(
      successfulStations,
      totalStations,
      errors.length > 0,
    );

    return {
      status,
      successfulStations,
      totalStations,
      errors,
      duration,
    };
  }
}
