import { Prisma } from '@lib/database';
import axios from 'axios';

export interface GlofasObservation {
  data: any;
  location: string;
}

export interface GlofasFetchResponse extends Omit<GlofasObservation, 'data'> {
  data: axios.AxiosResponse<any, any, {}>;
}

type PointForecast = {
  header: string;
  data: string;
};

type GlofasLocation = {
  type: string;
  basinId: string;
};

type GlofasSource = {
  key: string;
  metadata: GlofasMetadate;
};

type GlofasMetadate = {
  originalUnit: string;
};

export interface GlofasDataObject {
  kind: string;
  issuedAt: Date;
  location: GlofasLocation;
  source: GlofasSource;
  info: GlofasInfoObject;
  indicator: string;
  unit: string;
  value: number;
}

export interface GlofasInfoObject {
  pointForecastData: {
    forecastDate: PointForecast;
    maxProbability: PointForecast;
    alertLevel: PointForecast;
    maxProbabilityStep: PointForecast;
    dischargeTendencyImage: PointForecast;
    peakForecasted: PointForecast;
  };
  hydrographImageUrl: string;
  returnPeriodTable2yr: {
    returnPeriodData: any[];
    returnPeriodHeaders: string[];
  };
  returnPeriodTable5yr: {
    returnPeriodData: any[];
    returnPeriodHeaders: string[];
  };
  returnPeriodTable20yr: {
    returnPeriodData: any[];
    returnPeriodHeaders: string[];
  };
  forecastDate: string;
}

export type GfofasInfo = {
  location: { basinId: string };
};
