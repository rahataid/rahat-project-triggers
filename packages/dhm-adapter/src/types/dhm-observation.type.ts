import { Result } from "@lib/core";
import axios from "axios";

export interface DhmFetchResponse extends Omit<DhmObservation, "data"> {
  data: axios.AxiosResponse<any, any, {}>;
}

export interface DhmFetchParams {
  seriesIds: string[];
  startDate?: string;
  endDate?: string;
  location: string;
}

export interface DhmNormalizedItem {
  datetime: string;
  value: number;
  max?: number;
  min?: number;
}

export type DhmInputItem =
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

export enum DhmSourceDataTypeEnum {
  POINT = 1,
  HOURLY = 2,
  DAILY = 3,
}

type WaterLevelType = {
  value: number;
  datetime: string | Date;
};

export interface RiverStationItem {
  name: string;
  id: number;
  stationIndex: string;
  basin: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  series_id: number;
  waterLevel: WaterLevelType;
  status: string;
  warning_level: string;
  danger_level: string;
  steady: string;
  onm: string;
  description: string;
  elevation: number;
  images: Array<Record<string, any>>;
  tags: string[];
  indicator: string;
  units: string;
  value: number;
  history?: RiverWaterHistoryItem[];
}

export type RainfallStationItem = {
  latest_observation?: {
    value: number;
    datetime: string;
  };
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
  indicator: string;
  units: string;
  history?: RiverWaterHistoryItem[];
};

export type DhmStationItem =
  | RiverStationItem
  | RainfallStationItem
  | TemperatureStationItem;

export interface DhmObservation {
  data: DhmNormalizedItem[];
  stationDetail: DhmStationItem;
  seriesId: number;
  location?: string;
}
export interface RiverWaterHistoryItem {
  datetime: string;
  value: number;
  max?: number;
  min?: number;
}
export interface DhmStationResponse {
  type: number;
  rainfall_watch: RainfallStationItem[];
  river_watch: RiverStationItem[];
}

export type DhmInfo = {
  series_id: string;
  name: string;
};

export interface SeriesFetchParams {
  baseUrl: string;
  seriesId: number;
  period: DhmSourceDataTypeEnum;
  location: string;
  date?: Date;
}

// DHM Temperature (AWS) API types

export interface DhmTemperatureDataPoint {
  datetime: string;
  value: number;
}

export interface DhmTemperatureObservationParam {
  unit: string;
  series_id: number;
  parameter_name: string;
  parameter_code: string;
  series_name: string;
  data: DhmTemperatureDataPoint[];
}

export interface DhmTemperatureStation {
  station: string;
  longitude: number;
  latitude: number;
  observations: DhmTemperatureObservationParam[];
  value: number;
}

export interface DhmTemperatureApiResponse {
  type: number;
  data: {
    data: DhmTemperatureStation[];
  };
}

export interface TemperatureStationItem {
  name: string;
  longitude: number;
  latitude: number;
  value: number;
  parameter_name?: string;
  parameter_code?: string;
  series_name?: string;
  series_id?: number;
  history?: DhmTemperatureDataPoint[];
}
