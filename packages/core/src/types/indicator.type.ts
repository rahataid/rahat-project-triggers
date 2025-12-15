export type IndicatorType =
  | 'water_level_m'
  | 'discharge_m3s'
  | 'rainfall_mm' // 3
  | 'prob_flood';

export type LocationType =
  | { type: 'STATION'; seriesId: number }
  | { type: 'BASIN'; basinId: string; seriesId?: number }
  | { type: 'POINT'; lat: number; lon: number };

export interface Indicator<T = any> {
  kind: 'OBSERVATION' | 'FORECAST';
  indicator: IndicatorType;
  value: number;
  info?: T | T[];
  units: string;
  issuedAt: string;
  location: LocationType;
  source: {
    key: string;
    metadata?: Record<string, unknown>;
  };
  confidence?: number;
}
