import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import {
  DhmObservation,
  DhmFetchParams,
  DhmInputItem,
  DhmNormalizedItem,
  DhmSourceDataTypeEnum,
  DhmFetchResponse,
  DhmStationResponse,
  RiverStationData,
  RainfallStationItem,
  RiverStationItem,
} from "../types/dhm-observation.type";
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
  AdapterHealthConfig,
} from "@lib/core";
import { buildQueryParams, scrapeDataFromHtml } from "../../utils";
import {
  DataSource,
  SourceType,
  RainfallWaterLevelConfig,
} from "@lib/database";
import { SettingsService } from "@lib/core";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class DhmWaterLevelAdapter extends ObservationAdapter<DhmFetchParams> {
  private readonly logger = new Logger(DhmWaterLevelAdapter.name);

  constructor(
    @Inject(HttpService) httpService: HttpService,
    @Inject(HealthMonitoringService)
    healthService: HealthMonitoringService,
    @Inject(SettingsService) settingsService: SettingsService,
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2
  ) {
    super(httpService, settingsService, {
      dataSource: DataSource.DHM,
      sourceType: SourceType.WATER_LEVEL,
    });
    this.setHealthService(healthService);
  }

  getAdapterId(): string {
    return "DHM:WATER_LEVEL";
  }

  async init() {
    this.logger.log("DhmWaterLevelAdapter initialization");
    const payload: AdapterHealthConfig = {
      adapterId: this.getAdapterId(),
      name: "DHM Water Level API",
      dataSource: DataSource.DHM,
      sourceType: SourceType.WATER_LEVEL,
      sourceUrl: this.getUrl() || "",
      fetchIntervalMinutes: 15,
      staleThresholdMultiplier: 1.5,
    };

    this.registerHealthConfig(payload);
  }

  async getStationsDetailsBySeriesId(
    seriesId: number
  ): Promise<RiverStationData> {
    const baseUrl = `https://dhm.gov.np/home/getAPIData/3`;
    const defaultStation: RiverStationData = {
      name: "",
      id: 0,
      stationIndex: "",
      basin: "",
      district: "",
      latitude: 0,
      longitude: 0,
      series_id: 0,
      waterLevel: {
        value: 0,
        datetime: new Date().toISOString(),
      },
      status: "",
      warning_level: "",
      danger_level: "",
      steady: "",
      onm: "",
      description: "",
      elevation: 0,
      images: [],
      tags: [],
      indicator: "",
      units: "",
      value: 0,
    };
    try {
      const response =
        await this.httpService.axiosRef.get<DhmStationResponse>(baseUrl);
      const riverWatch = response.data.river_watch;
      const station = riverWatch.find(
        (station) => station.series_id === seriesId
      );

      if (!station) {
        this.logger.warn(`Station not found for seriesId ${seriesId}`);
        return defaultStation;
      }

      return station;
    } catch (error: any) {
      this.logger.error(
        `Failed to get stations details for seriesId ${seriesId}`,
        error
      );
      return defaultStation;
    }
  }

  private getLatestWaterLevelValue(
    stationDetail: RiverStationItem | RainfallStationItem
  ): number {
    if ("waterLevel" in stationDetail) {
      return stationDetail.waterLevel?.value ?? 0;
    }

    return 0;
  }

  /**
   * Fetch raw HTML/data from DHM website
   */
  async fetch(): Promise<Result<DhmFetchResponse[]>> {
    const itemErrors: any[] = [];
    const successfulResults: DhmFetchResponse[] = [];

    try {
      this.logger.log(`Fetching DHM data for stations`);

      const baseUrl = this.getUrl();

      const config: RainfallWaterLevelConfig["WATER_LEVEL"][] =
        this.getConfig();

      if (!baseUrl) {
        this.logger.error("DHM Water Level URL is not configured");
        return Err("DHM Water Level URL is not configured");
      }

      const allSeriesIds = config.flatMap((cfg) => cfg.SERIESID);

      const results = await Promise.allSettled(
        config.flatMap((cfg) => {
          return cfg.SERIESID.map(async (seriesId) => {
            const queryParams = buildQueryParams(seriesId);

            const form = new FormData();

            form.append("date", queryParams.date_from || "");
            form.append("period", DhmSourceDataTypeEnum.POINT.toString());
            form.append("seriesid", seriesId.toString());

            return {
              data: await this.httpService.axiosRef.post(baseUrl, form),
              stationDetail: await this.getStationsDetailsBySeriesId(seriesId),
              seriesId,
              location: cfg.LOCATION,
            };
          });
        })
      );

      results.forEach((result, index) => {
        const seriesId = allSeriesIds[index];
        if (!seriesId) {
          return;
        }

        if (result.status === "fulfilled") {
          successfulResults.push(result.value);
        } else {
          itemErrors.push({
            itemId: seriesId.toString(),
            stage: "fetch" as const,
            errorCode: "FETCH_FAILED",
            message: result.reason?.message || "Unknown error",
            timestamp: new Date().toISOString(),
          });
          this.logger.warn(
            `Failed to fetch data for seriesId ${seriesId}: ${result.reason?.message}`
          );
        }
      });

      if (successfulResults.length === 0) {
        return Err("All seriesIds failed", null, {
          totalItems: allSeriesIds.length,
          successfulItems: 0,
          failedItems: allSeriesIds.length,
          itemErrors,
        });
      }

      if (itemErrors.length > 0) {
        return Ok(successfulResults, {
          totalItems: allSeriesIds.length,
          successfulItems: successfulResults.length,
          failedItems: itemErrors.length,
          itemErrors,
        });
      }

      return Ok(successfulResults, {
        totalItems: allSeriesIds.length,
        successfulItems: successfulResults.length,
        failedItems: 0,
      });
    } catch (error: any) {
      console.log(error);
      this.logger.error("Failed to fetch DHM data", error);
      return Err("Failed to fetch DHM observations", error);
    }
  }

  /**
   * Parse HTML and extract meaningful observation data
   */
  aggregate(rawDatas: DhmFetchResponse[]): Result<DhmObservation[]> {
    try {
      const observations: DhmObservation[] = [];

      for (const {
        data: { data: rawData },
        stationDetail,
        seriesId,
        location,
      } of rawDatas) {
        const data = scrapeDataFromHtml(rawData.data.table);

        if (!data || data.length === 0) {
          this.logger.warn(`No data found`);
          continue;
        }

        const normalizedData = this.normalizeDhmRiverAndRainfallWatchData(
          data as DhmInputItem[]
        );

        observations.push({
          data: normalizedData,
          stationDetail,
          seriesId,
          location,
        });
      }

      this.logger.log(`Aggregated ${observations.length} DHM observations`);
      return Ok(observations);
    } catch (error: any) {
      this.logger.error("Failed to aggregate DHM data", error);
      return Err("Failed to parse DHM HTML data", error);
    }
  }

  /**
   * Transform DHM observations to standard Indicators using ACL
   */
  transform(aggregatedData: DhmObservation[]): Result<Indicator[]> {
    try {
      const observations = aggregatedData as DhmObservation[];

      const indicators: Indicator[] = observations.flatMap((obs) => {
        const baseIndicator = {
          kind: "OBSERVATION" as const,
          issuedAt: new Date().toISOString(),
          location: {
            type: "BASIN" as const,
            seriesId: obs.seriesId,
            basinId: obs.location!,
          },
          source: {
            key: "DHM",
            metadata: { originalUnit: "m" },
          },
          info: { ...obs.stationDetail, history: obs.data },
        };

        const results: Indicator[] = [];

        // Water level indicator
        results.push({
          ...baseIndicator,
          indicator: "water_level_m",
          units: "m",
          value: this.getLatestWaterLevelValue(obs.stationDetail),
        });

        return results;
      });

      this.logger.log(`Transformed to ${indicators.length} indicators`);
      this.emitDataSourceEvent(indicators);
      return Ok(indicators);
    } catch (error: any) {
      this.logger.error("Failed to transform DHM data", error);
      return Err("Failed to transform to indicators", error);
    }
  }

  private emitDataSourceEvent(indicators: Indicator[]): void {
    if (!this.eventEmitter || indicators.length === 0) {
      return;
    }

    const payload: DataSourceEventPayload = {
      dataSource: DataSource.DHM,
      sourceType: SourceType.WATER_LEVEL,
      indicators,
      fetchedAt: new Date().toISOString(),
    };

    this.eventEmitter.emit(DATA_SOURCE_EVENTS.DHM.WATER_LEVEL, payload);
  }

  /**
   * Main pipeline execution - chains fetch → aggregate → transform
   * Using functional composition - no if-else needed!
   */
  async execute(): Promise<
    Result<Indicator<{ value: number; datetime: string }>[]>
  > {
    return chainAsync(this.fetch(), (rawData: DhmFetchResponse[]) =>
      chainAsync(this.aggregate(rawData), (observations: DhmObservation[]) =>
        this.transform(observations)
      )
    );
  }

  private normalizeDhmRiverAndRainfallWatchData(
    dataArray: DhmInputItem[]
  ): DhmNormalizedItem[] {
    return dataArray.map((item) => {
      const base = {
        datetime: item.Date,
      };

      if ("Point" in item) {
        return {
          ...base,
          value: item.Point,
        };
      }

      if ("Average" in item && "Max" in item && "Min" in item) {
        return {
          ...base,
          value: item.Average,
          max: item.Max,
          min: item.Min,
        };
      }

      if ("Total" in item && "Hourly" in item) {
        return {
          ...base,
          value: item.Total,
          min: Math.min(item.Hourly, item.Total),
          max: Math.max(item.Hourly, item.Total),
        };
      }

      if ("Total" in item && "Daily" in item) {
        return {
          ...base,
          value: item.Total,
          min: Math.min(item.Daily, item.Total),
          max: Math.max(item.Daily, item.Total),
        };
      }

      throw new Error("Invalid data format");
    });
  }
}
