import { DataSource, SourceType } from '@prisma/client';

export type RainfallWaterLevelConfig = {
  [SourceType.RAINFALL]: {
    LOCATION: string;
    SERIESID: number;
  };
  [SourceType.WATER_LEVEL]: {
    LOCATION: string;
    SERIESID: number;
  };
};

export type DataSourceValue = {
  [DataSource.DHM]: RainfallWaterLevelConfig[];
  [DataSource.GLOFAS]: Record<string, never>;
};

export type DataSourceConfig = {
  name: string;
  value: DataSourceValue;
  isPrivate: boolean;
};
