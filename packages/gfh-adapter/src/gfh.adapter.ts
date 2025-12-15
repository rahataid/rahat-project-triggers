import {
  chainAsync,
  DATA_SOURCE_EVENTS,
  DataSourceEventPayload,
  Err,
  ExecutionContext,
  HealthMonitoringService,
  Indicator,
  ItemError,
  ObservationAdapter,
  Ok,
  Result,
  SettingsService,
} from "@lib/core";
import { DataSource, SourceType } from "@lib/database";
import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getFormattedDate } from "./utils";
import {
  BatchGetResponse,
  Forecast,
  Gauge,
  GaugeData,
  GaugeInfo,
  GfhFetchResponse,
  GfhObservation,
  GfhStationDetails,
  IApiKeyData,
  Point,
  ProcessedForecast,
  QueryForecastsResponse,
  SearchGaugesRequest,
  SearchGaugesResponse,
  StationLoacationDetails,
  StationResult,
} from "types";

@Injectable()
export class GfhAdapter extends ObservationAdapter {
  private readonly logger = new Logger(GfhAdapter.name);
  private readonly regionCode = "NP";
  private readonly pageSize = 1000;
  private readonly matchRadiusKm = 12;
  private apiKey: string = "";
  private gauges: Gauge[] = [];

  constructor(
    @Inject(HttpService) httpService: HttpService,
    @Inject(SettingsService) settingsService: SettingsService,
    @Inject(HealthMonitoringService) healthService: HealthMonitoringService,
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2
  ) {
    super(httpService, settingsService, {
      dataSource: DataSource.GFH,
    });
    this.setHealthService(healthService);
  }

  getAdapterId(): string {
    return "GFH";
  }

  async init() {
    this.logger.log("GFH Adapter Initialization");

    this.registerHealthConfig({
      adapterId: this.getAdapterId(),
      name: "Gfh API",
      dataSource: DataSource.GFH,
      sourceUrl: this.getUrl() || "",
      fetchIntervalMinutes: 60,
      staleThresholdMultiplier: 1.1,
    });
    const GfhApiData = SettingsService.get("GFHAPIKEY") as IApiKeyData;
    this.apiKey = GfhApiData.API_KEY || "";
  }

  /**
   * Fetch raw data from GFH API
   */
  async fetch(): Promise<Result<GfhFetchResponse[]>> {
    const itemErrors: ItemError[] = [];
    const successfulResults: GfhFetchResponse[] = [];

    try {
      this.logger.log("Fetching GFH observations...");

      const baseUrl = this.getUrl();
      if (!baseUrl || !this.apiKey) {
        this.logger.error("GFH URL or api key is not configured");
        return Err("GFH URL or api key is not configured");
      }

      if (this.gauges.length === 0) {
        this.gauges = await this.fetchGauges();
      }
      if (this.gauges.length === 0) {
        this.logger.error("No gauges found");
        return Err("No gauges found");
      }

      const config: GfhStationDetails[] = this.getConfig();

      const allStationDetails = config.flatMap(
        (gfhStationDetails) => gfhStationDetails.STATION_LOCATIONS_DETAILS
      );

      const results = await Promise.allSettled(
        config.flatMap((gfhStationDetails) => {
          return gfhStationDetails.STATION_LOCATIONS_DETAILS.map(
            async (stationDetails): Promise<GfhFetchResponse> => {
              const [stationGaugeMapping, uniqueGaugeIds] =
                this.matchStationToGauge(this.gauges, stationDetails);

              return {
                data: await this.processGaugeData(uniqueGaugeIds),
                location: gfhStationDetails.RIVER_BASIN,
                stationId: stationDetails.STATION_ID,
                stationGaugeMapping,
              };
            }
          );
        })
      );

      results.forEach((result, index) => {
        const stationDetails = allStationDetails[index];
        if (!stationDetails) {
          return;
        }
        if (result.status === "fulfilled") {
          successfulResults.push(result.value);
        } else {
          itemErrors.push({
            itemId: stationDetails.STATION_ID,
            itemName: stationDetails.STATION_NAME,
            stage: "fetch" as const,
            code: "FETCH_FAILED",
            message: result.reason?.message || "Unknown error",
            timestamp: new Date().toISOString(),
          });
          this.logger.warn(
            `Failed to fetch data for station ${stationDetails.STATION_ID}: ${result.reason?.message}`
          );
        }
      });

      if (successfulResults.length === 0) {
        return Err("All stations failed", null, {
          totalItems: allStationDetails.length,
          successfulItems: 0,
          failedItems: allStationDetails.length,
          itemErrors,
        });
      }

      if (itemErrors.length > 0) {
        return Ok(successfulResults, {
          totalItems: allStationDetails.length,
          successfulItems: successfulResults.length,
          failedItems: itemErrors.length,
          itemErrors,
        });
      }

      return Ok(successfulResults, {
        totalItems: allStationDetails.length,
        successfulItems: successfulResults.length,
        itemErrors,
        failedItems: 0,
      });
    } catch (error: any) {
      this.logger.error("Failed to fetch GFH data", error);
      return Err("Failed to fetch GFH observations", error);
    }
  }

  /**
   * Parse and extract meaningful observation data
   */
  aggregate(
    rawDatas: GfhFetchResponse[],
    executionContext?: ExecutionContext
  ): Result<GfhObservation[]> {
    const itemErrors: ItemError[] = executionContext?.itemErrors || [];

    try {
      const observations: GfhObservation[] = [];

      const config: GfhStationDetails[] = this.getConfig();
      const stationDetailsMap = new Map<string, StationLoacationDetails>();

      config.forEach((gfhStationDetails) => {
        gfhStationDetails.STATION_LOCATIONS_DETAILS.forEach(
          (stationDetails) => {
            stationDetailsMap.set(stationDetails.STATION_ID, stationDetails);
          }
        );
      });

      for (const rawData of rawDatas) {
        const stationDetails = stationDetailsMap.get(rawData.stationId);
        if (!stationDetails) {
          this.logger.warn(
            `Station details not found for station ${rawData.stationId}`
          );
          continue;
        }

        const output = this.buildFinalOutput(
          rawData.stationGaugeMapping,
          rawData.data
        );

        const [stationKey, stationData] = Object.entries(output)[0] || [];
        if (!stationKey || !stationData) {
          this.logger.warn(
            `No data found for station ${stationDetails.STATION_NAME}`
          );
          if (
            executionContext?.itemErrors
              ?.map((item) => item.itemId)
              .includes(stationDetails.STATION_ID)
          ) {
            continue;
          } else {
            itemErrors.push({
              itemId: stationDetails.STATION_ID,
              itemName: stationDetails.STATION_NAME,
              stage: "aggregate" as const,
              code: "GFH_NO_DATA",
              message: `No data found for station ${stationDetails.STATION_NAME}`,
              timestamp: new Date().toISOString(),
            });
          }
          continue;
        }

        observations.push({
          stationData: stationData as StationResult,
          stationName: stationDetails.STATION_NAME,
          riverBasin: rawData.location,
        });
      }

      this.logger.log(`Aggregated ${observations.length} GFH observations`);

      if (observations.length === 0) {
        return Err("No data found for any station", null, {
          totalItems: executionContext?.totalItems || rawDatas.length,
          successfulItems: 0,
          failedItems: itemErrors.length,
          itemErrors,
        });
      }

      if (itemErrors.length > 0) {
        return Ok(observations, {
          totalItems: executionContext?.totalItems || rawDatas.length,
          successfulItems: observations.length,
          failedItems: itemErrors.length,
          itemErrors,
        });
      }

      return Ok(observations);
    } catch (error: any) {
      this.logger.error("Failed to aggregate GFH data", error);
      return Err("Failed to parse GFH data", error);
    }
  }

  /**
   * Transform GFH observations to standard Indicators
   */
  transform(aggregatedData: GfhObservation[]): Result<Indicator[]> {
    try {
      const observations = aggregatedData as GfhObservation[];

      const { dateString } = getFormattedDate();

      const indicators: Indicator[] = observations.flatMap((obs) => {
        const stationDetails = {
          riverBasin: obs.riverBasin,
          forecastDate: dateString,
          source: obs.stationData?.source || "",
          latitude: obs.stationData?.gaugeLocation?.latitude?.toFixed(6) || "",
          longitude:
            obs.stationData?.gaugeLocation?.longitude?.toFixed(6) || "",
          stationName: obs.stationName || "",
          warningLevel:
            obs.stationData?.model_metadata?.thresholds?.warningLevel?.toFixed(
              3
            ) || "",
          dangerLevel:
            obs.stationData?.model_metadata?.thresholds?.dangerLevel?.toFixed(
              3
            ) || "",
          extremeDangerLevel:
            obs.stationData?.model_metadata?.thresholds?.extremeDangerLevel?.toFixed(
              3
            ) || "",
          basinSize:
            obs.stationData?.model_metadata?.thresholds?.basinSize || 0,
          riverGaugeId: obs.stationData?.gaugeId || "",
        };

        const history = (obs.stationData?.forecasts || []).map((forecast) => ({
          value: (forecast as any).value || 0,
          datetime:
            forecast.timeRange?.startTime || obs.stationData?.issuedTime || "",
        }));

        const baseIndicator = {
          kind: "OBSERVATION" as const,
          issuedAt: new Date().toISOString(),
          location: {
            type: "BASIN" as const,
            basinId: obs.riverBasin,
          },
          source: {
            key: "GFH",
            metadata: { originalUnit: "m³/s" },
          },
          info: {
            ...stationDetails,
            history,
          },
        };

        const results: Indicator[] = [];

        results.push({
          ...baseIndicator,
          indicator: "discharge_m3s",
          units: "m³/s",
          value: (obs.stationData?.forecasts?.[0] as any)?.value || 0,
        });

        return results;
      });
      this.emitDataSourceEvent(indicators);

      this.logger.log(`Transformed to ${indicators.length} indicators`);
      return Ok(indicators);
    } catch (error: any) {
      this.logger.error("Failed to transform GFH data", error);
      return Err("Failed to transform to indicators", error);
    }
  }

  /**
   * Main pipeline execution - chains fetch → aggregate → transform
   * Using functional composition - no if-else needed!
   */
  async execute(): Promise<Result<Indicator[]>> {
    return chainAsync(
      this.fetch(),
      (rawData: GfhFetchResponse[], executionContext?: ExecutionContext) =>
        chainAsync(
          this.aggregate(rawData, executionContext),
          (observations: GfhObservation[]) => this.transform(observations)
        )
    );
  }

  private async fetchGauges() {
    const requestData: SearchGaugesRequest = {
      regionCode: this.regionCode,
      pageSize: this.pageSize,
      includeNonQualityVerified: true,
    };

    const allGauges: Gauge[] = [];
    try {
      while (true) {
        const response = await this.makeRequest<SearchGaugesResponse>(
          "gauges:searchGaugesByArea",
          "POST",
          undefined,
          requestData
        );

        if (!response) {
          break;
        }
        const gauges = response.gauges || [];
        allGauges.push(...gauges);

        const nextPageToken = response.nextPageToken;
        if (!nextPageToken) {
          break;
        }
        requestData.pageToken = nextPageToken;
      }
      return allGauges;
    } catch (error) {
      this.logger.error("Failed to fetch gauges", error);
      return [];
    }
  }

  private matchStationToGauge(
    gauges: Gauge[],
    station: StationLoacationDetails
  ): [Record<string, GaugeInfo | null>, Set<string>] {
    this.logger.log(
      `Matching station ${station.STATION_ID} to gauges within ${this.matchRadiusKm}km...`
    );

    const validGauges = this.filterValidGauges(gauges);
    const stationGaugeMapping: Record<string, GaugeInfo | null> = {};
    const uniqueGaugeIds = new Set<string>();

    try {
      if (station.RIVER_GAUGE_ID) {
        // If the station has a specific gauge ID, prioritize it
        this.logger.log(
          `Station ${station.STATION_ID} has specific gauge ID ${station.RIVER_GAUGE_ID}`
        );

        const matchedGauge = validGauges.find(
          (g) => g.gaugeId === station.RIVER_GAUGE_ID
        );
        if (matchedGauge) {
          const stationPoint = this.createPoint(
            station["LISFLOOD_X_(DEG)"],
            station["LISFLOOD_Y_[DEG]"]
          );

          const gaugePoint = this.createPoint(
            matchedGauge.location.longitude,
            matchedGauge.location.latitude
          );

          const distance = this.haversineKm(stationPoint, gaugePoint);

          stationGaugeMapping[station.STATION_ID] = {
            gaugeId: matchedGauge.gaugeId,
            distance,
            source: matchedGauge.source || "",
            gaugeLocation: matchedGauge.location,
            qualityVerified: matchedGauge.qualityVerified || false,
          };
          uniqueGaugeIds.add(matchedGauge.gaugeId);
          this.logger.log(
            `Station ${station.STATION_ID} matched to gauge ${matchedGauge.gaugeId} (${distance.toFixed(2)}km)`
          );

          return [stationGaugeMapping, uniqueGaugeIds];
        }
      }

      const stationPoint = this.createPoint(
        station["LISFLOOD_X_(DEG)"],
        station["LISFLOOD_Y_[DEG]"]
      );

      // Calculate distances to all gauges
      const gaugeDistances = validGauges.map((gauge) => {
        const gaugePoint = this.createPoint(
          gauge.location.longitude,
          gauge.location.latitude
        );
        return {
          gauge,
          distance: this.haversineKm(stationPoint, gaugePoint),
        };
      });

      // Find nearby gauges
      const nearbyGauges = gaugeDistances.filter(
        (gd) => gd.distance <= this.matchRadiusKm
      );

      if (nearbyGauges.length === 0) {
        stationGaugeMapping[station.STATION_ID] = null;
        this.logger.warn(
          `No gauges found within ${this.matchRadiusKm}km for station ${station.STATION_ID}`
        );
      } else {
        // Find closest gauge
        const bestGauge = nearbyGauges.reduce((min, current) =>
          current.distance < min.distance ? current : min
        );

        const gaugeId = bestGauge.gauge.gaugeId;
        uniqueGaugeIds.add(gaugeId);

        stationGaugeMapping[station.STATION_ID] = {
          gaugeId,
          distance: bestGauge.distance,
          source: bestGauge.gauge.source || "",
          gaugeLocation: bestGauge.gauge.location,
          qualityVerified: bestGauge.gauge.qualityVerified || false,
        };

        this.logger.log(
          `Station ${station.STATION_ID} matched to gauge ${gaugeId} ` +
            `(${bestGauge.distance.toFixed(2)}km)`
        );
      }
    } catch (error) {
      this.logger.error(
        `Error matching station ${station.STATION_ID}: ${error}`
      );
      stationGaugeMapping[station.STATION_ID] = null;
    }

    return [stationGaugeMapping, uniqueGaugeIds];
  }

  private filterValidGauges(gauges: Gauge[]): Gauge[] {
    return gauges.filter(
      (g) =>
        g.location &&
        typeof g.location.latitude === "number" &&
        typeof g.location.longitude === "number"
    );
  }

  private createPoint(x: number, y: number): Point {
    return { x, y };
  }

  private haversineKm(pt1: Point, pt2: Point): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(pt2.y - pt1.y);
    const dLon = this.toRadians(pt2.x - pt1.x);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(pt1.y)) *
        Math.cos(this.toRadians(pt2.y)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const test = R * c;
    return test;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async processGaugeData(
    uniqueGaugeIds: Set<string>
  ): Promise<Record<string, GaugeData>> {
    this.logger.log(
      `Processing data for ${uniqueGaugeIds.size} unique gauges...`
    );

    const gaugeDataCache: Record<string, GaugeData> = {};

    for (const gaugeId of uniqueGaugeIds) {
      // Fetch metadata
      const metadata = await this.fetchGaugeMetadata(gaugeId);

      // Fetch forecasts
      const forecasts = await this.fetchGaugeForecasts(gaugeId);

      // Process latest forecast
      let latestForecast: ProcessedForecast | null = null;
      if (forecasts.length > 0) {
        const latest = forecasts.reduce((max, current) =>
          new Date(current.issuedTime) > new Date(max.issuedTime)
            ? current
            : max
        );

        // Extract first forecast range for summary
        const firstRange = latest.forecastRanges?.[0] || {};

        latestForecast = {
          issuedTime: latest.issuedTime,
          forecastTimeRange: firstRange.timeRange || {},
          forecastTrend: firstRange.trend || "UNKNOWN",
          severity: firstRange.severity || "UNKNOWN",
          forecastRanges: latest.forecastRanges || [],
        };
      }

      gaugeDataCache[gaugeId] = {
        model_metadata: metadata,
        all_forecasts: forecasts,
        latest_forecast: latestForecast,
      };
    }

    return gaugeDataCache;
  }

  private async fetchGaugeMetadata(gaugeId: string): Promise<any> {
    const endpoint = "gaugeModels:batchGet";
    const params = { names: `gaugeModels/${gaugeId}` };

    const response = await this.makeRequest<BatchGetResponse>(
      endpoint,
      "GET",
      params
    );

    if (response && response.gaugeModels) {
      return response.gaugeModels[0] || {};
    }

    return {};
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    params?: Record<string, any>,
    jsonData?: any
  ): Promise<T | null> {
    const url = new URL(`${this.getUrl()}/${endpoint}`);

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "POST") {
      if (jsonData) {
        options.body = JSON.stringify(jsonData);
      }
      url.searchParams.append("key", this.apiKey);
    } else {
      // GET request
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, v));
          } else {
            url.searchParams.append(key, String(value));
          }
        });
      }
      url.searchParams.append("key", this.apiKey);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  private async fetchGaugeForecasts(
    gaugeId: string,
    daysBack: number = 7
  ): Promise<Forecast[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const endpoint = "gauges:queryGaugeForecasts";
    const params = {
      gaugeIds: [gaugeId],
      issuedTimeStart: startDate.toISOString().split("T")[0],
      issuedTimeEnd: now.toISOString().split("T")[0],
    };

    const response = await this.makeRequest<QueryForecastsResponse>(
      endpoint,
      "GET",
      params
    );

    if (response && response.forecasts) {
      const gaugeForecasts = response.forecasts[gaugeId];
      return gaugeForecasts?.forecasts || [];
    }

    return [];
  }

  private buildFinalOutput(
    stationGaugeMapping: Record<string, GaugeInfo | null>,
    gaugeDataCache: Record<string, GaugeData>
  ): Record<string, StationResult | null> {
    this.logger.log("Building final output...");

    const output: Record<string, StationResult | null> = {};

    for (const [stationId, gaugeInfo] of Object.entries(stationGaugeMapping)) {
      if (gaugeInfo === null) {
        output[stationId] = null;
        continue;
      }

      const gaugeId = gaugeInfo.gaugeId;
      const cachedData: any = gaugeDataCache[gaugeId] || {};

      // Build base result
      const result: StationResult = {
        gaugeId,
        distance_km: Math.round(gaugeInfo.distance * 100) / 100,
        source: gaugeInfo.source,
        gaugeLocation: gaugeInfo.gaugeLocation,
        qualityVerified: gaugeInfo.qualityVerified,
        model_metadata: cachedData.model_metadata || {},
        issuedTime: null,
        forecastTimeRange: {},
        forecastTrend: "UNKNOWN",
        severity: "UNKNOWN",
        forecasts: [],
        total_forecasts_available: 0,
      };

      // Add forecast information
      const latestForecast = cachedData.latest_forecast;
      if (latestForecast) {
        result.issuedTime = latestForecast.issuedTime;
        result.forecastTimeRange = latestForecast.forecastTimeRange;
        result.forecastTrend = latestForecast.forecastTrend;
        result.severity = latestForecast.severity;
        result.forecasts = latestForecast.forecastRanges;
        result.total_forecasts_available =
          cachedData.all_forecasts?.length || 0;
      } else {
        result.message = "No forecasts available";
      }

      output[stationId] = result;
    }

    return output;
  }

  private emitDataSourceEvent(indicators: Indicator[]): void {
    if (!this.eventEmitter || indicators.length === 0) {
      return;
    }

    const payload: DataSourceEventPayload = {
      dataSource: DataSource.GFH,
      sourceType: SourceType.WATER_LEVEL,
      indicators,
      fetchedAt: new Date().toISOString(),
    };

    this.eventEmitter.emit(DATA_SOURCE_EVENTS.GFH.WATER_LEVEL, payload);
  }
}
