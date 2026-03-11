import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import {
  DhmObservation,
  DhmTemperatureApiResponse,
  DhmTemperatureStation,
  DhmTemperatureObservationParam,
  TemperatureStationItem,
} from "../types/dhm-observation.type";
import {
  Indicator,
  Result,
  Ok,
  ObservationAdapter,
  Err,
  chainAsync,
  SettingsService,
  HealthMonitoringService,
  ItemError,
  DATA_SOURCE_EVENTS,
  DataSourceEventPayload,
} from "@lib/core";
import {
  DataSource,
  SourceType,
  RainfallWaterLevelConfig,
} from "@lib/database";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class DhmTemperatureAdapter extends ObservationAdapter<undefined> {
  private readonly logger = new Logger(DhmTemperatureAdapter.name);

  constructor(
    @Inject(HttpService) httpService: HttpService,
    @Inject(SettingsService) settingsService: SettingsService,
    @Inject(HealthMonitoringService)
    healthService: HealthMonitoringService,
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2,
  ) {
    super(httpService, settingsService, {
      dataSource: DataSource.DHM,
      sourceType: SourceType.TEMPERATURE,
    });
    this.setHealthService(healthService);
  }

  getAdapterId(): string {
    return "DHM:TEMPERATURE";
  }

  async init() {
    this.logger.log("DhmTemperatureAdapter initialization");

    this.registerHealthConfig({
      adapterId: this.getAdapterId(),
      name: "DHM Temperature API",
      dataSource: DataSource.DHM,
      sourceType: SourceType.TEMPERATURE,
      sourceUrl: this.getUrl() || "",
      fetchIntervalMinutes: 60,
      staleThresholdMultiplier: 1.5,
    });
  }

  /**
   * Fetch JSON data from DHM AWS API (single GET request returns all stations)
   */
  async fetch(): Promise<Result<DhmTemperatureApiResponse>> {
    try {
      const baseUrl = this.getUrl();

      if (!baseUrl) {
        this.logger.error("DHM TEMPERATURE URL is not configured");
        return Err("DHM TEMPERATURE URL is not configured", null, {
          totalItems: 1,
          successfulItems: 0,
          failedItems: 1,
          itemErrors: [
            {
              itemId: "TEMPERATURE_API",
              stage: "fetch" as const,
              code: "URL_NOT_CONFIGURED",
              message: "DHM TEMPERATURE URL is not configured",
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }

      this.logger.log(`Fetching DHM temperature data from ${baseUrl}`);
      const response =
        await this.httpService.axiosRef.get<DhmTemperatureApiResponse>(baseUrl);

      this.logger.log(
        `Fetched DHM temperature data successfully with status ${response.status}`,
      );

      return Ok(response.data, {
        totalItems: 1,
        successfulItems: 1,
        failedItems: 0,
      });
    } catch (error: any) {
      this.logger.error("Failed to fetch DHM temperature data", error);
      return Err("Failed to fetch DHM temperature data", error, {
        totalItems: 1,
        successfulItems: 0,
        failedItems: 1,
        itemErrors: [
          {
            itemId: "TEMPERATURE_API",
            stage: "fetch" as const,
            code: "FETCH_FAILED",
            message: error?.message || "Unknown error",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }

  /**
   * Parse API response and extract normalized observations per station/series.
   * Each station observation parameter becomes a separate DhmObservation entry.
   * If SERIESID is configured, only matching series are included.
   * Tracks missing series IDs as item-level errors for health monitoring.
   */
  aggregate(apiResponse: DhmTemperatureApiResponse): Result<DhmObservation[]> {
    try {
      const stations = apiResponse.data?.data;

      if (!stations || stations.length === 0) {
        this.logger.warn("No station data found in temperature API response");
        return Ok([], {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 0,
        });
      }

      const config: RainfallWaterLevelConfig["TEMPERATURE"][] =
        this.getConfig() ?? [];
      const configuredSeriesIds = config.flatMap((cfg) => cfg.SERIESID);

      if (configuredSeriesIds.length === 0) {
        return Err("No configuration found for DHM Temperature.", null, {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 0,
        });
      }

      const availableSeriesIds = this.collectAvailableSeriesIds(stations);
      const itemErrors = this.findMissingSeriesErrors(
        configuredSeriesIds,
        availableSeriesIds,
      );
      const observations = this.extractObservationsFromStations(
        stations,
        config,
        configuredSeriesIds,
      );

      return this.buildAggregateResult(
        observations,
        itemErrors,
        configuredSeriesIds.length,
        stations.length,
      );
    } catch (error: any) {
      this.logger.error("Failed to aggregate DHM temperature data", error);
      return Err("Failed to parse DHM temperature data", error, {
        totalItems: 1,
        successfulItems: 0,
        failedItems: 1,
        itemErrors: [
          {
            itemId: "TEMPERATURE_AGGREGATE",
            stage: "aggregate" as const,
            code: "AGGREGATE_FAILED",
            message: error?.message || "Unknown error",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }

  private collectAvailableSeriesIds(
    stations: DhmTemperatureStation[],
  ): Set<number> {
    const ids = new Set<number>();
    for (const station of stations) {
      for (const obs of station.observations) {
        ids.add(obs.series_id);
      }
    }
    return ids;
  }

  private findMissingSeriesErrors(
    configuredSeriesIds: number[],
    availableSeriesIds: Set<number>,
  ): ItemError[] {
    const errors: ItemError[] = [];
    for (const seriesId of configuredSeriesIds) {
      if (!availableSeriesIds.has(seriesId)) {
        errors.push({
          itemId: seriesId.toString(),
          stage: "aggregate" as const,
          code: "SERIES_NOT_FOUND",
          message: `Series ID ${seriesId} not found in API response`,
          timestamp: new Date().toISOString(),
        });
        this.logger.warn(
          `Configured series ID ${seriesId} not found in temperature API response`,
        );
      }
    }
    return errors;
  }

  private extractObservationsFromStations(
    stations: DhmTemperatureStation[],
    config: RainfallWaterLevelConfig["TEMPERATURE"][],
    configuredSeriesIds: number[],
  ): DhmObservation[] {
    const observations: DhmObservation[] = [];
    const seriesLocationMap = new Map<number, string>();

    for (const cfg of config) {
      for (const id of cfg.SERIESID) {
        seriesLocationMap.set(id, cfg.LOCATION);
      }
    }

    for (const station of stations) {
      const hasConfiguredSeries = station.observations.some((obs) =>
        configuredSeriesIds.includes(obs.series_id),
      );

      if (!hasConfiguredSeries) continue;

      const stationDetail = this.buildStationDetail(station);
      const matched = this.matchObservationsForStation(
        station.observations,
        configuredSeriesIds,
        stationDetail,
        seriesLocationMap,
      );
      observations.push(...matched);
    }

    return observations;
  }

  private buildStationDetail(
    station: DhmTemperatureStation,
  ): TemperatureStationItem {
    return {
      name: station.station,
      longitude: station.longitude,
      latitude: station.latitude,
      value: station.value,
    };
  }

  private matchObservationsForStation(
    stationObservations: DhmTemperatureObservationParam[],
    configuredSeriesIds: number[],
    stationDetail: TemperatureStationItem,
    seriesLocationMap: Map<number, string>,
  ): DhmObservation[] {
    const results: DhmObservation[] = [];

    for (const obs of stationObservations) {
      if (!configuredSeriesIds.includes(obs.series_id)) continue;
      if (!obs.data) continue;

      const location = seriesLocationMap.get(obs.series_id);

      results.push({
        data: obs.data,
        stationDetail: {
          ...stationDetail,
          parameter_code: obs.parameter_code,
          parameter_name: obs.parameter_name,
          series_name: obs.series_name,
          series_id: obs.series_id,
        },
        seriesId: obs.series_id,
        location,
      });
    }

    return results;
  }

  private buildAggregateResult(
    observations: DhmObservation[],
    itemErrors: ItemError[],
    totalConfigured: number,
    stationCount: number,
  ): Result<DhmObservation[]> {
    const totalItems = totalConfigured || observations.length;

    this.logger.log(
      `Aggregated ${observations.length} temperature observations from ${stationCount} stations`,
    );

    if (observations.length === 0 && totalConfigured > 0) {
      return Err("No matching series found in temperature API response", null, {
        totalItems,
        successfulItems: 0,
        failedItems: totalItems,
        itemErrors,
      });
    }

    return Ok(observations, {
      totalItems,
      successfulItems: observations.length,
      failedItems: itemErrors.length,
      itemErrors: itemErrors.length > 0 ? itemErrors : undefined,
    });
  }

  /**
   * Transform DHM temperature observations to standard Indicators
   */
  transform(aggregatedData: DhmObservation[]): Result<Indicator[]> {
    try {
      const indicators: Indicator[] = aggregatedData.flatMap((obs) => {
        return [
          {
            kind: "OBSERVATION",
            indicator: "temperature_c",
            value: obs.stationDetail.value ?? 0,
            units: "°C",
            issuedAt: new Date().toISOString(),
            location: {
              type: "BASIN",
              seriesId: obs.seriesId,
              basinId: obs.location!,
            },
            source: {
              key: "DHM",
              metadata: { originalUnit: "°C" },
            },
            info: { ...obs.stationDetail, history: obs.data },
          },
        ];
      });

      this.logger.log(`Transformed to ${indicators.length} indicators`);
      this.emitDataSourceEvent(indicators);
      return Ok(indicators);
    } catch (error: any) {
      this.logger.error("Failed to transform DHM temperature data", error);
      return Err("Failed to transform to indicators", error);
    }
  }

  /**
   * Main pipeline execution - chains fetch → aggregate → transform
   */
  async execute(): Promise<Result<Indicator[]>> {
    return chainAsync(this.fetch(), (apiResponse: DhmTemperatureApiResponse) =>
      chainAsync(
        this.aggregate(apiResponse),
        (observations: DhmObservation[]) => this.transform(observations),
      ),
    );
  }

  private emitDataSourceEvent(indicators: Indicator[]): void {
    if (!this.eventEmitter || indicators.length === 0) {
      return;
    }

    const payload: DataSourceEventPayload = {
      dataSource: DataSource.DHM,
      sourceType: SourceType.TEMPERATURE,
      indicators,
      fetchedAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(DATA_SOURCE_EVENTS.DHM.TEMPERATURE, payload);
  }
}
