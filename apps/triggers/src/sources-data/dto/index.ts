export * from './create-sources-data.dto';
export * from './update-sources-data.dto';
export * from './add-trigger-statement.dto';

type PointForecast = {
  header: string;
  data: string;
};
export interface GlofasStationInfo {
 stationId: string;
 orgFolder: string;
 location: string; 
}

export interface GlofasDataObject {
  pointForecastData: {
    forecastDate: PointForecast;
    maxProbability: PointForecast;
    alertLevel: PointForecast;
    maxProbabilityStep: PointForecast;
    peakForecasted: PointForecast;
  };
  returnPeriodTable: {
    returnPeriodData: any[];
    returnPeriodHeaders: string[];
  };
  forecastDate: string;
}

export interface DhmDataObject {
  id: number;
  createdOn: string;
  title: string;
  basin: string;
  point: { [key: string]: any };
  waterLevel: number;
  image: string;
  dangerLevel: number;
  warningLevel: number;
  waterLevelOn: string;
  status: string;
  steady: string;
  description: string;
  station: number;
}

export interface DHMWaterLevelInfo {
  id: number;
  onm: string;
  name: string;
  tags: boolean;
  basin: string;
  images: {
    id: number;
    name: string;
    size: number;
    type: number;
    description: string;
  }[];
  status: string;
  steady: string;
  history: {
    datetime: string;
    value: number;
  }[];
  district: string;
  latitude: number;
  elevation: number;
  longitude: number;
  series_id: number;
  waterLevel: {
    value: number;
    datetime: string;
  };
  description: string;
  danger_level: string;
  stationIndex: string;
  warning_level: string;
}
