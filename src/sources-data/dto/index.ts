export * from './create-sources-data.dto';
export * from './update-sources-data.dto';

type PointForecast = {
  header: string;
  data: string;
};
export interface GlofasStationInfo {
  LOCATION: string;
  I: string;
  J: string;
  URL: string;
  BBOX: string;
  TIMESTRING: string;
}

export interface GlofasDataObject {
  pointForecastData: {
    forecastDate: PointForecast;
    maxProbability: PointForecast;
    alertLevel: PointForecast;
    maxProbabilityStep: PointForecast;
    dischargeTendencyImage: PointForecast;
    peakForecasted: PointForecast;
  };
  hydrographImageUrl: string;
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
