export interface RiverStationItem {
  name: string;
  id: number;
  stationIndex: string;
  basin: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  series_id: number;
  waterLevel: number | null;
  status: string;
  warning_level: string;
  danger_level: string;
  steady: string;
  onm: string;
  description: string;
  elevation: number;
  images: Array<Record<string, any>>;
  tags: string[];
}

export type RainfallStationItem = {
  id: number;
  series_id: number;
  stationIndex: string;
  name: string;
  status: string;
  basin: string;
  district: string;
  description: string;
  longitude: number;
  latitude: number;
  value: number | null;
  interval: number | null;
  blink: boolean;
};

export interface RiverWaterHistoryItem {
  datetime: string;
  value: number;
  max?: number;
  min?: number;
}

export interface RiverStationData extends RiverStationItem {
  history?: RiverWaterHistoryItem[];
}

export interface RainfallStationData extends RainfallStationItem {
  history?: RiverWaterHistoryItem[];
}

export interface gfhStationDetails {
  source: string;
  latitude: number;
  longitude: number;
  riverGaugeId: string;
  stationName: string;
  warningLevel: string;
  dangerLevel: string;
  extremeDangerLevel: string;
  basinSize: number;
  forecastDate: string;
}

export interface gfhStationData extends gfhStationDetails {
  history?: RiverWaterHistoryItem[];
}

export enum SourceDataTypeEnum {
  POINT = 1,
  HOURLY = 2,
  DAILY = 3,
}

export type InputItem =
  | {
      Date: string;
      Point: number;
    }
  | {
      Date: string;
      Max: number;
      Min: number;
      Average: number;
    }
  | {
      Date: string;
      Hourly: number;
      Total: number;
    }
  | {
      Date: string;
      Daily: number;
      Total: number;
    };

export interface NormalizedItem {
  datetime: string;
  value: number;
  max?: number;
  min?: number;
}

export interface Point {
  x: number;
  y: number;
}

interface Location {
  latitude: number;
  longitude: number;
}

export interface GfhStationDetails {
  LATITUDE: number;
  POINT_ID: string;
  RIVER_GAUGE_ID?: string;
  LONGITUDE: number;
  RIVER_NAME: string;
  STATION_ID: string;
  STATION_NAME: string;
  'LISFLOOD_X_(DEG)': number;
  'LISFLOOD_Y_[DEG]': number;
  LISFLOOD_DRAINAGE_AREA: number;
}

export interface Gauge {
  gaugeId: string;
  location: Location;
  source?: string;
  qualityVerified?: boolean;
  [key: string]: any;
}

interface ForecastRange {
  timeRange?: {
    startTime?: string;
    endTime?: string;
  };
  trend?: string;
  severity?: string;
  [key: string]: any;
}

export interface Forecast {
  issuedTime: string;
  forecastRanges: ForecastRange[];
  [key: string]: any;
}

export interface GaugeInfo {
  gaugeId: string;
  distance: number;
  source: string;
  gaugeLocation: Location;
  qualityVerified: boolean;
}

export interface ProcessedForecast {
  issuedTime: string;
  forecastTimeRange: any;
  forecastTrend: string;
  severity: string;
  forecastRanges: ForecastRange[];
}

export interface GaugeData {
  model_metadata: any;
  all_forecasts: Forecast[];
  latest_forecast: ProcessedForecast | null;
}

export interface StationResult {
  gaugeId: string;
  distance_km: number;
  source: string;
  gaugeLocation: Location;
  qualityVerified: boolean;
  model_metadata: any;
  issuedTime: string | null;
  forecastTimeRange: any;
  forecastTrend: string;
  severity: string;
  forecasts: ForecastRange[];
  total_forecasts_available: number;
  message?: string;
}

export interface SearchGaugesRequest {
  regionCode: string;
  pageSize: number;
  includeNonQualityVerified: boolean;
  pageToken?: string;
}

export interface SearchGaugesResponse {
  gauges: Gauge[];
  nextPageToken?: string;
}

export interface BatchGetResponse {
  gaugeModels: any[];
}

export interface QueryForecastsResponse {
  forecasts: Record<string, { forecasts: Forecast[] }>;
}
