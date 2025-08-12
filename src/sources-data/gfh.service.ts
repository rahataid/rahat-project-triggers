import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SourceType } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import {
  BatchGetResponse,
  Forecast,
  Gauge,
  GaugeData,
  GaugeInfo,
  gfhStationData,
  gfhStationDetails,
  GfhStationDetails,
  Point,
  ProcessedForecast,
  QueryForecastsResponse,
  SearchGaugesRequest,
  SearchGaugesResponse,
  StationResult,
} from 'src/types/data-source';

@Injectable()
export class GfhService {
  private readonly logger = new Logger(GfhService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://floodforecasting.googleapis.com/v1';
  private readonly regionCode = 'NP';
  private readonly pageSize = 1000;
  private readonly matchRadiusKm = 12;

  constructor(
    private readonly httpService: HttpService,
    private prisma: PrismaService,
  ) {
    this.apiKey = process.env.FLOODS_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'API key not found. Set FLOODS_API_KEY environment variable',
      );
    }
  }

  async fetchAllGauges(): Promise<Gauge[]> {
    this.logger.log('Fetching all gauges for Nepal...');

    const requestData: SearchGaugesRequest = {
      regionCode: this.regionCode,
      pageSize: this.pageSize,
      includeNonQualityVerified: true,
    };

    const allGauges: Gauge[] = [];

    while (true) {
      const response = await this.makeRequest<SearchGaugesResponse>(
        'gauges:searchGaugesByArea',
        'POST',
        undefined,
        requestData,
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
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params?: Record<string, any>,
    jsonData?: any,
  ): Promise<T | null> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST') {
        if (jsonData) {
          options.body = JSON.stringify(jsonData);
        }
        url.searchParams.append('key', this.apiKey);
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
        url.searchParams.append('key', this.apiKey);
      }

      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      Logger.error(`API request failed for ${endpoint}: ${error}`);
      return null;
    }
  }

  matchStationToGauge(
    gauges: Gauge[],
    station: GfhStationDetails,
  ): [Record<string, GaugeInfo | null>, Set<string>] {
    this.logger.log(
      `Matching station ${station.STATION_ID} to gauges within ${this.matchRadiusKm}km...`,
    );

    const validGauges = this.filterValidGauges(gauges);
    const stationGaugeMapping: Record<string, GaugeInfo | null> = {};
    const uniqueGaugeIds = new Set<string>();

    try {
      if (station.RIVER_GAUGE_ID) {
        // If the station has a specific gauge ID, prioritize it
        this.logger.log(
          `Station ${station.STATION_ID} has specific gauge ID ${station.RIVER_GAUGE_ID}`,
        );

        const matchedGauge = validGauges.find(
          (g) => g.gaugeId === station.RIVER_GAUGE_ID,
        );
        if (matchedGauge) {
          const stationPoint = this.createPoint(
            station['LISFLOOD_X_(DEG)'],
            station['LISFLOOD_Y_[DEG]'],
          );

          const gaugePoint = this.createPoint(
            matchedGauge.location.longitude,
            matchedGauge.location.latitude,
          );

          const distance = this.haversineKm(stationPoint, gaugePoint);

          stationGaugeMapping[station.STATION_ID] = {
            gaugeId: matchedGauge.gaugeId,
            distance,
            source: matchedGauge.source || '',
            gaugeLocation: matchedGauge.location,
            qualityVerified: matchedGauge.qualityVerified || false,
          };
          uniqueGaugeIds.add(matchedGauge.gaugeId);
          this.logger.log(
            `Station ${station.STATION_ID} matched to gauge ${matchedGauge.gaugeId} (${distance.toFixed(2)}km)`,
          );

          return [stationGaugeMapping, uniqueGaugeIds];
        }
      }

      const stationPoint = this.createPoint(
        station['LISFLOOD_X_(DEG)'],
        station['LISFLOOD_Y_[DEG]'],
      );

      // Calculate distances to all gauges
      const gaugeDistances = validGauges.map((gauge) => {
        const gaugePoint = this.createPoint(
          gauge.location.longitude,
          gauge.location.latitude,
        );
        return {
          gauge,
          distance: this.haversineKm(stationPoint, gaugePoint),
        };
      });

      // Find nearby gauges
      const nearbyGauges = gaugeDistances.filter(
        (gd) => gd.distance <= this.matchRadiusKm,
      );

      if (nearbyGauges.length === 0) {
        stationGaugeMapping[station.STATION_ID] = null;
        this.logger.warn(
          `No gauges found within ${this.matchRadiusKm}km for station ${station.STATION_ID}`,
        );
      } else {
        // Find closest gauge
        const bestGauge = nearbyGauges.reduce((min, current) =>
          current.distance < min.distance ? current : min,
        );

        const gaugeId = bestGauge.gauge.gaugeId;
        uniqueGaugeIds.add(gaugeId);

        stationGaugeMapping[station.STATION_ID] = {
          gaugeId,
          distance: bestGauge.distance,
          source: bestGauge.gauge.source || '',
          gaugeLocation: bestGauge.gauge.location,
          qualityVerified: bestGauge.gauge.qualityVerified || false,
        };

        this.logger.log(
          `Station ${station.STATION_ID} matched to gauge ${gaugeId} ` +
            `(${bestGauge.distance.toFixed(2)}km)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error matching station ${station.STATION_ID}: ${error}`,
      );
      stationGaugeMapping[station.STATION_ID] = null;
    }

    return [stationGaugeMapping, uniqueGaugeIds];
  }

  private filterValidGauges(gauges: Gauge[]): Gauge[] {
    return gauges.filter(
      (g) =>
        g.location &&
        typeof g.location.latitude === 'number' &&
        typeof g.location.longitude === 'number',
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

  async processGaugeData(
    uniqueGaugeIds: Set<string>,
  ): Promise<Record<string, GaugeData>> {
    this.logger.log(
      `Processing data for ${uniqueGaugeIds.size} unique gauges...`,
    );

    const gaugeDataCache: Record<string, GaugeData> = {};

    for (const gaugeId of uniqueGaugeIds) {
      try {
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
              : max,
          );

          // Extract first forecast range for summary
          const firstRange = latest.forecastRanges?.[0] || {};

          latestForecast = {
            issuedTime: latest.issuedTime,
            forecastTimeRange: firstRange.timeRange || {},
            forecastTrend: firstRange.trend || 'UNKNOWN',
            severity: firstRange.severity || 'UNKNOWN',
            forecastRanges: latest.forecastRanges || [],
          };
        }

        gaugeDataCache[gaugeId] = {
          model_metadata: metadata,
          all_forecasts: forecasts,
          latest_forecast: latestForecast,
        };
      } catch (error) {
        Logger.error(`Error processing gauge ${gaugeId}: ${error}`);
        gaugeDataCache[gaugeId] = {
          model_metadata: {},
          all_forecasts: [],
          latest_forecast: null,
        };
      }
    }

    return gaugeDataCache;
  }

  async fetchGaugeMetadata(gaugeId: string): Promise<any> {
    const endpoint = 'gaugeModels:batchGet';
    const params = { names: `gaugeModels/${gaugeId}` };

    const response = await this.makeRequest<BatchGetResponse>(
      endpoint,
      'GET',
      params,
    );

    if (response && response.gaugeModels) {
      return response.gaugeModels[0] || {};
    }

    return {};
  }

  async fetchGaugeForecasts(
    gaugeId: string,
    daysBack: number = 7,
  ): Promise<Forecast[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const endpoint = 'gauges:queryGaugeForecasts';
    const params = {
      gaugeIds: [gaugeId],
      issuedTimeStart: startDate.toISOString().split('T')[0],
      issuedTimeEnd: now.toISOString().split('T')[0],
    };

    const response = await this.makeRequest<QueryForecastsResponse>(
      endpoint,
      'GET',
      params,
    );

    if (response && response.forecasts) {
      const gaugeForecasts = response.forecasts[gaugeId];
      return gaugeForecasts?.forecasts || [];
    }

    return [];
  }

  buildFinalOutput(
    stationGaugeMapping: Record<string, GaugeInfo | null>,
    gaugeDataCache: Record<string, GaugeData>,
  ): Record<string, StationResult | null> {
    this.logger.log('Building final output...');

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
        forecastTrend: 'UNKNOWN',
        severity: 'UNKNOWN',
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
        result.message = 'No forecasts available';
      }

      output[stationId] = result;
    }

    return output;
  }

  formateGfhStationData(
    dateString: string,
    stationData: any,
    stationName: string,
  ) {
    const stationDetails: gfhStationDetails = {
      forecastDate: dateString,
      source: stationData?.source || '',
      latitude: stationData?.gaugeLocation?.latitude?.toFixed(6),
      longitude: stationData?.gaugeLocation?.longitude?.toFixed(6),
      stationName: stationName || '',
      warningLevel:
        stationData.model_metadata?.thresholds?.warningLevel?.toFixed(3) || '',
      dangerLevel:
        stationData.model_metadata?.thresholds?.dangerLevel?.toFixed(3) || '',
      extremeDangerLevel:
        stationData.model_metadata?.thresholds?.extremeDangerLevel?.toFixed(
          3,
        ) || '',
      basinSize: stationData.model_metadata?.thresholds?.basinSize || 0,
      riverGaugeId: stationData?.gaugeId || '',
    };

    const history = (stationData?.forecasts || []).map((forecast) => ({
      value: forecast.value?.toFixed(1) || 0,
      datetime: forecast.forecastStartTime,
    }));

    return {
      ...stationDetails,
      history,
    };
  }

  async saveDataInGfh(
    type: SourceType,
    riverBasin: string,
    payload: gfhStationData,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingRecord = await tx.sourcesData.findFirst({
          where: {
            type,
            dataSource: DataSource.GFH,
            source: {
              riverBasin,
            },
          },
        });

        if (existingRecord) {
          return await tx.sourcesData.update({
            where: { id: existingRecord.id },
            data: {
              info: {
                ...(existingRecord.info &&
                  JSON.parse(JSON.stringify(existingRecord.info))),
                ...JSON.parse(JSON.stringify(payload)),
              },
              updatedAt: new Date(),
            },
          });
        } else {
          return await tx.sourcesData.create({
            data: {
              type,
              dataSource: DataSource.GFH,
              info: JSON.parse(JSON.stringify(payload)),
              source: {
                connectOrCreate: {
                  where: {
                    riverBasin,
                  },
                  create: {
                    source: [DataSource.DHM],
                    riverBasin,
                  },
                },
              },
            },
          });
        }
      });
    } catch (err) {
      this.logger.error(`Error saving data for ${riverBasin}:`, err);
      throw err;
    }
  }
}
