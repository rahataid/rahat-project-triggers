export interface GlofasObservation {
  data: any;
  location: string;
}
export interface GlofasFetchResponse {
  dischargeContent: string;
  returnLevelContent: string;
  forecastDate: string;
  location: string;
  stationId: string;
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
    maxProbability: PointForecast;
    alertLevel: PointForecast;
    maxProbabilityStep: PointForecast;
    peakForecasted: PointForecast;
    dischargeTendencyImage: PointForecast;
  };
  returnPeriodTable2yr: {
    returnPeriodData: string[][];
    returnPeriodHeaders: string[];
  };
  returnPeriodTable5yr: {
    returnPeriodData: string[][];
    returnPeriodHeaders: string[];
  };
  returnPeriodTable20yr: {
    returnPeriodData: string[][];
    returnPeriodHeaders: string[];
  };
  forecastDate: string;
  dischargeSeries: { date: string; min: number; mean: number; max: number }[];
}

export type GlofasInfo = {
  location: { basinId: string };
};
