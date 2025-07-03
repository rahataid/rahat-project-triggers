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
    };

export interface NormalizedItem {
  datetime: string;
  value: number;
  max?: number;
  min?: number;
}
