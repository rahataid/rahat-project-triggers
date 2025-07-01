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
}

export interface RiverStationData extends RiverStationItem {
  history?: RiverWaterHistoryItem[];
}

export interface RainfallStationData extends RainfallStationItem {
  history?: RiverWaterHistoryItem[];
}
