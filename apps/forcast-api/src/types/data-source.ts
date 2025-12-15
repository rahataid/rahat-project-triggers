export interface GfhStationDetails {
  RIVER_BASIN: string;
  STATION_LOCATIONS_DETAILS: StationLoacationDetails[];
}

export interface StationLoacationDetails {
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
  THRESHOLDS?: GfhThresholds;
}
interface GfhThresholds {
  WARNING_LEVEL: number;
  DANGER_LEVEL: number;
  EXTREME_DANGER_LEVEL: number;
}

export interface DataSourceSettings {
  DHM?: any[];
  GFH?: any[];
  GLOFAS?: any[];
}
