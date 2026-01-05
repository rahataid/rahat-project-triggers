import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  Indicator,
  Result,
  Ok,
  ObservationAdapter,
  Err,
  chainAsync,
  DATA_SOURCE_EVENTS,
  DataSourceEventPayload,
  HealthMonitoringService,
} from '@lib/core';

import { DataSource, GlofasStationInfo, SourceType } from '@lib/database';
import { SettingsService } from '@lib/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getFormattedDate, parseGlofasData } from './utils';
import { GlofasFetchResponse, GlofasObservation } from './types';

@Injectable()
export class GlofasAdapter extends ObservationAdapter {
  private readonly logger = new Logger(GlofasAdapter.name);

  constructor(
    @Inject(HttpService) httpService: HttpService,
    @Inject(SettingsService) settingsService: SettingsService,
    @Inject(HealthMonitoringService) healthService: HealthMonitoringService,
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2,
  ) {
    super(httpService, settingsService, {
      dataSource: DataSource.GLOFAS,
    });
    this.setHealthService(healthService);
  }

  getAdapterId(): string {
    return 'GLOFAS';
  }

  async init() {
    this.logger.log('Glofas Adapter initialization');

    this.registerHealthConfig({
      adapterId: this.getAdapterId(),
      name: 'Glofas API',
      dataSource: DataSource.GLOFAS,
      sourceUrl: this.getUrl() || '',
      fetchIntervalMinutes: 60,
      staleThresholdMultiplier: 1.1,
    });
  }

  /**
   * Fetch raw HTML/data from Glofas website
   */
  async fetch(): Promise<Result<GlofasFetchResponse[]>> {
    const itemErrors: any[] = [];
    const successfulResults: GlofasFetchResponse[] = [];

    try {
      const baseUrl = this.getUrl();

      const config: GlofasStationInfo[] = this.getConfig();

      if (!baseUrl) {
        this.logger.error('Glofas Water Level URL is not configured');
        return Err('Glofas Water Level URL is not configured');
      }

      const results = await Promise.allSettled(
        config.map(async (cfg) => {
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const { dateTimeString } = getFormattedDate(yesterdayDate);

          const glofasURL = new URL(baseUrl);

          const queryParams = {
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetFeatureInfo',
            FORMAT: 'image/png',
            TRANSPARENT: 'true',
            QUERY_LAYERS: 'reportingPoints',
            LAYERS: 'reportingPoints',
            INFO_FORMAT: 'application/json',
            WIDTH: '832',
            HEIGHT: '832',
            CRS: 'EPSG:3857',
            STYLES: '',
            BBOX: cfg.BBOX,
            I: cfg.I,
            J: cfg.J,
            TIME: dateTimeString,
          };

          for (const [key, value] of Object.entries(queryParams)) {
            glofasURL.searchParams.append(key, value);
          }

          return {
            data: await this.httpService.axiosRef.get(glofasURL.toString()),
            location: cfg.LOCATION,
          };
        }),
      );

      results.forEach((result, index) => {
        const station = config[index];
        if (!station) {
          return;
        }

        const location = station.LOCATION;
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          itemErrors.push({
            itemId: location,
            stage: 'fetch' as const,
            errorCode: 'FETCH_FAILED',
            message: result.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          this.logger.warn(
            `Failed to fetch data for location ${location}: ${result.reason?.message}`,
          );
        }
      });

      if (successfulResults.length === 0) {
        return Err('All locations failed', null, {
          totalItems: config.length,
          successfulItems: 0,
          failedItems: config.length,
          itemErrors,
        });
      }

      if (itemErrors.length > 0) {
        return Ok(successfulResults, {
          totalItems: config.length,
          successfulItems: successfulResults.length,
          failedItems: itemErrors.length,
          itemErrors,
        });
      }

      return Ok(successfulResults, {
        totalItems: config.length,
        successfulItems: successfulResults.length,
        failedItems: 0,
      });
    } catch (error: any) {
      console.log(error);
      this.logger.error('Failed to fetch Glofas data', error);
      return Err('Failed to fetch Glofas observations', error);
    }
  }

  /**
   * Parse HTML and extract meaningful observation data
   */
  aggregate(rawDatas: GlofasFetchResponse[]): Result<GlofasObservation[]> {
    try {
      const observations: GlofasObservation[] = [];

      for (const {
        data: { data: rawData },
        location,
      } of rawDatas) {
        const reportingPoints = rawData?.content['Reporting Points'].point;
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const { dateString } = getFormattedDate(yesterdayDate);
        const glofasData = parseGlofasData(reportingPoints);

        observations.push({
          data: {
            ...glofasData,
            forecastDate: dateString,
          },
          location,
        });
      }

      this.logger.log(`Aggregated ${observations.length} DHM observations`);
      return Ok(observations);
    } catch (error: any) {
      this.logger.error('Failed to aggregate DHM data', error);
      return Err('Failed to parse DHM HTML data', error);
    }
  }

  /**
   * Transform DHM observations to standard Indicators using ACL
   */
  transform(aggregatedData: GlofasObservation[]): Result<Indicator[]> {
    try {
      const observations = aggregatedData as GlofasObservation[];

      const indicators: Indicator[] = observations.flatMap((obs) => {
        const baseIndicator = {
          kind: 'OBSERVATION' as const,
          issuedAt: new Date().toISOString(),
          location: {
            type: 'BASIN' as const,
            basinId: obs.location,
          },
          source: {
            key: obs.location,
            metadata: { originalUnit: 'percentage' },
          },
          info: obs.data,
        };

        const pointForecastData = obs.data?.pointForecastData;
        const maxProbability = pointForecastData.maxProbability.data;

        const results: Indicator[] = [];

        results.push({
          ...baseIndicator,
          indicator: 'prob_flood',
          units: 'percentage',
          value: maxProbability || '0 / 0 / 0',
        });

        return results;
      });

      this.logger.log(`Transformed to ${indicators.length} indicators`);
      this.emitDataSourceEvent(indicators);
      return Ok(indicators);
    } catch (error: any) {
      this.logger.error('Failed to transform DHM data', error);
      return Err('Failed to transform to indicators', error);
    }
  }

  /**
   * Main pipeline execution - chains fetch → aggregate → transform
   * Using functional composition - no if-else needed!
   */
  async execute(): Promise<Result<Indicator[]>> {
    return chainAsync(this.fetch(), (rawData: GlofasFetchResponse[]) =>
      chainAsync(this.aggregate(rawData), (observations: GlofasObservation[]) =>
        this.transform(observations),
      ),
    );
  }

  private emitDataSourceEvent(indicators: Indicator[]): void {
    if (!this.eventEmitter || indicators.length === 0) {
      return;
    }

    const payload: DataSourceEventPayload = {
      dataSource: DataSource.GLOFAS,
      sourceType: SourceType.WATER_LEVEL,
      indicators,
      fetchedAt: new Date().toISOString(),
    };

    this.eventEmitter.emit(DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL, payload);
  }
}
