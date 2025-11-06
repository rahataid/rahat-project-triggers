import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  SourceHealthData,
  HealthCacheData,
  SourceConfig,
  SourceStatus,
  SourceValidity,
} from './dto/health.type';

@Injectable()
export class HealthCacheService {
  private readonly logger = new Logger(HealthCacheService.name);
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private readonly HEALTH_KEY_PREFIX = 'health:source';
  private readonly HEALTH_SUMMARY_KEY = 'health:summary';
  private readonly SOURCE_CONFIG_KEY = 'health:config';
  private readonly TTL = 1200; // 20 minutes (longer than 15 min cron)

  /**
   * Store source configuration for validity calculations
   */
  async setSourceConfig(sourceConfig: SourceConfig): Promise<void> {
    const key = `${this.SOURCE_CONFIG_KEY}:${sourceConfig.source_id}`;

    try {
      // if config already exists, delete it
      if (await this.getSourceConfig(sourceConfig.source_id)) {
        await this.redis.del(key);
      }

      await this.redis.set(key, JSON.stringify(sourceConfig));
    } catch (error) {
      this.logger.error(
        `Failed to cache source config for ${sourceConfig.source_id}:`,
        error,
      );
    }
  }

  /**
   * Get source configuration
   */
  async getSourceConfig(sourceId: string): Promise<SourceConfig | null> {
    const key = `${this.SOURCE_CONFIG_KEY}:${sourceId}`;

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get source config for ${sourceId}:`, error);
      return null;
    }
  }

  /**
   * Store individual source health data
   */
  async setSourceHealth(
    sourceId: string,
    healthData: SourceHealthData,
  ): Promise<void> {
    const key = `${this.HEALTH_KEY_PREFIX}:${sourceId}`;

    try {
      const ttl = await this.calculateTTL(sourceId);
      const fetchFrequency = await this.calculateFetchFrequency(sourceId);

      healthData.fetch_frequency_minutes = fetchFrequency;

      await this.redis.setex(key, ttl, JSON.stringify(healthData));

      await this.updateHealthSummary();
    } catch (error) {
      this.logger.error(`Failed to cache health data for ${sourceId}:`, error);
      throw error;
    }
  }
  /**
   * Calculate fetch frequency based on source configuration
   * @param sourceId - source id
   * @returns fetch frequency in minutes
   */
  async calculateFetchFrequency(sourceId: string): Promise<number> {
    const sourceConfig = await this.getSourceConfig(sourceId);
    return sourceConfig?.fetch_interval_minutes || 15;
  }

  /**
   * Calculate TTL based on source configuration
   * @param sourceId - source id
   * @returns ttl in seconds
   */
  private async calculateTTL(sourceId: string): Promise<number> {
    try {
      const sourceConfig = await this.getSourceConfig(sourceId);

      if (!sourceConfig) {
        return this.TTL;
      }

      const fetchIntervalMinutes = sourceConfig.fetch_interval_minutes;
      const staleMultiplier = sourceConfig?.stale_threshold_multiplier || 1.5;

      // Set TTL to slightly beyond the EXPIRED threshold
      // This ensures data stays in cache even when marked as EXPIRED
      const expiredThresholdMinutes = fetchIntervalMinutes * staleMultiplier;
      const ttlMinutes = expiredThresholdMinutes * 1.2; // 20% buffer beyond EXPIRED

      return Math.ceil(ttlMinutes * 60); // Convert to seconds
    } catch (error) {
      this.logger.error(`Failed to calculate TTL for ${sourceId}:`, error);
      return this.TTL;
    }
  }

  /**
   * Get individual source health data
   */
  async getSourceHealth(sourceId: string): Promise<SourceHealthData | null> {
    const key = `${this.HEALTH_KEY_PREFIX}:${sourceId}`;

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get health data for ${sourceId}:`, error);
      return null;
    }
  }

  /**
   * Get all sources health data
   */
  async getAllSourcesHealth(): Promise<SourceHealthData[]> {
    try {
      const pattern = `${this.HEALTH_KEY_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        this.logger.warn('No sources health data found in CACHE');
        return [];
      }

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.get(key));

      const results = await pipeline.exec();

      return results
        .filter(([err, data]) => !err && data)
        .map(([, data]) => JSON.parse(data as string))
        .sort((a, b) => a.source_id.localeCompare(b.source_id));
    } catch (error) {
      this.logger.error('Failed to get all sources health:', error);
      return [];
    }
  }

  /**
   * Update overall health summary
   */
  private async updateHealthSummary(): Promise<void> {
    try {
      const sources = await this.getAllSourcesHealth();
      const overallStatus = this.calculateOverallStatus(sources);

      const summary: HealthCacheData = {
        overall_status: overallStatus as SourceStatus,
        last_updated: new Date().toISOString(),
        sources,
      };

      await this.redis.setex(
        this.HEALTH_SUMMARY_KEY,
        this.TTL,
        JSON.stringify(summary),
      );
    } catch (error) {
      this.logger.error('Failed to update health summary:', error);
    }
  }

  /**
   * Get complete health summary
   */
  async getHealthSummary(): Promise<HealthCacheData> {
    try {
      const cachedSummary: string | null = await this.redis.get(
        this.HEALTH_SUMMARY_KEY,
      );

      if (cachedSummary) {
        const cachedSummaryData: HealthCacheData | null =
          JSON.parse(cachedSummary);
        if (cachedSummaryData.overall_status !== 'UNHEALTHY') {
          return cachedSummaryData;
        }
      }

      // If no cached summary, generate fresh one
      const sources = await this.getAllSourcesHealth();
      this.logger.log('sources', sources);
      const overallStatus = this.calculateOverallStatus(sources);
      this.logger.log('overallStatus', overallStatus);

      const summary: HealthCacheData = {
        overall_status: overallStatus,
        last_updated: new Date().toISOString(),
        sources,
      };

      // Cache the fresh summary
      await this.redis.setex(
        this.HEALTH_SUMMARY_KEY,
        this.TTL,
        JSON.stringify(summary),
      );

      return summary;
    } catch (error) {
      this.logger.error('Failed to get health summary:', error);
      return {
        overall_status: 'UNHEALTHY',
        last_updated: new Date().toISOString(),
        sources: [],
      };
    }
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallStatus(sources: SourceHealthData[]): SourceStatus {
    if (sources.length === 0) return 'UNHEALTHY';

    const upCount = sources.filter((s) => s.status === 'HEALTHY').length;
    const downCount = sources.filter((s) => s.status === 'UNHEALTHY').length;

    // All sources are UP
    if (upCount === sources.length) return 'HEALTHY';

    // More than half are DOWN
    if (downCount > sources.length / 2) return 'UNHEALTHY';

    // Some issues but not critical
    return 'DEGRADED';
  }

  /**
   * Remove source health data (useful for cleanup)
   */
  async removeSourceHealth(sourceId: string): Promise<void> {
    const key = `${this.HEALTH_KEY_PREFIX}:${sourceId}`;

    try {
      await this.redis.del(key);
      await this.updateHealthSummary();
    } catch (error) {
      this.logger.error(`Failed to remove health data for ${sourceId}:`, error);
    }
  }

  /**
   * Helper method to create health data with current timestamp
   */
  async createHealthData({
    sourceId,
    name,
    sourceUrl,
    status,
    responseTimeMs = null,
    errors = null,
  }: {
    sourceId: string;
    name: string;
    sourceUrl: string;
    status: SourceStatus;
    responseTimeMs?: number | null;
    errors?: Array<any> | null;
  }): Promise<SourceHealthData> {
    const now = new Date().toISOString();
    const validity = await this.calculateValidity(sourceId, now);

    return {
      source_id: sourceId,
      name,
      source_url: sourceUrl,
      status,
      last_checked: now,
      response_time_ms: responseTimeMs,
      validity,
      errors,
    };
  }

  /**
   * Calculate data validity based on source-specific configuration
   */
  private async calculateValidity(
    sourceId: string,
    lastChecked: string,
  ): Promise<SourceValidity> {
    try {
      const sourceConfig = await this.getSourceConfig(sourceId);

      // Fallback to default if no config found (assume 15-minute interval)
      const fetchIntervalMinutes = sourceConfig?.fetch_interval_minutes || 15;
      const staleMultiplier = sourceConfig?.stale_threshold_multiplier || 1.5;

      const now = new Date();
      const checked = new Date(lastChecked);
      const minutesAgo = (now.getTime() - checked.getTime()) / (1000 * 60);

      const staleThreshold = fetchIntervalMinutes * staleMultiplier;

      if (minutesAgo <= fetchIntervalMinutes) return 'VALID';
      if (minutesAgo <= staleThreshold) return 'STALE';
      return 'EXPIRED';
    } catch (error) {
      this.logger.error(`Failed to calculate validity for ${sourceId}:`, error);
      return 'EXPIRED'; // Safe default
    }
  }
}
