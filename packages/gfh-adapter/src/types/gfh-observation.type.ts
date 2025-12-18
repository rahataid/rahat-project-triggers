import { Prisma } from "@lib/database";

export type GfhStationDetails = {
  RIVER_BASIN: string;
  STATION_LOCATIONS_DETAILS: StationLoacationDetails[];
};

export interface StationLoacationDetails {
  LATITUDE: number;
  POINT_ID: string;
  RIVER_GAUGE_ID?: string;
  LONGITUDE: number;
  RIVER_NAME: string;
  STATION_ID: string;
  STATION_NAME: string;
  "LISFLOOD_X_(DEG)": number;
  "LISFLOOD_Y_[DEG]": number;
  LISFLOOD_DRAINAGE_AREA: number;
}

export interface SearchGaugesRequest {
  regionCode: string;
  pageSize: number;
  includeNonQualityVerified: boolean;
  pageToken?: string;
}

export interface Gauge {
  gaugeId: string;
  location: Location;
  source?: string;
  qualityVerified?: boolean;
  [key: string]: any;
}

interface Location {
  latitude: number;
  longitude: number;
}

export interface SearchGaugesResponse {
  gauges: Gauge[];
  nextPageToken?: string;
}

export interface IApiKeyData {
  API_KEY: string;
}

export interface GaugeInfo {
  gaugeId: string;
  distance: number;
  source: string;
  gaugeLocation: Location;
  qualityVerified: boolean;
}

export interface Point {
  x: number;
  y: number;
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

export interface BatchGetResponse {
  gaugeModels: any[];
}

export interface QueryForecastsResponse {
  forecasts: Record<string, { forecasts: Forecast[] }>;
}

export interface ProcessedForecast {
  issuedTime: string;
  forecastTimeRange: any;
  forecastTrend: string;
  severity: string;
  forecastRanges: ForecastRange[];
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

export interface GfhFetchResponse {
  data: Record<string, GaugeData>;
  location: string;
  stationId: string;
  stationGaugeMapping: Record<string, GaugeInfo | null>;
}

export interface GfhObservation {
  stationData: StationResult;
  stationName: string;
  riverBasin: string;
}

export interface GfhHistoryItem {
  value: string | number;
  datetime: string;
}

export interface GfhTransformedResult {
  riverBasin: string;
  source: string;
  latitude: string;
  longitude: string;
  riverGaugeId: string;
  stationName: string;
  warningLevel: string;
  dangerLevel: string;
  extremeDangerLevel: string;
  basinSize: number;
  forecastDate: string;
  history: GfhHistoryItem[];
}

export type GfhInfo = {
  info: { riverGaugeId: string; stationName: string };
};
