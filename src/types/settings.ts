import { DataSource, SourceType } from '@prisma/client';
import { GlofasStationInfo } from 'src/sources-data/dto';

export type RainfallWaterLevelConfig = {
  [SourceType.RAINFALL]: {
    LOCATION: string;
    SERIESID: number[];
  };
  [SourceType.WATER_LEVEL]: {
    LOCATION: string;
    SERIESID: number[];
  };
};

export type DataSourceValue = {
  [DataSource.DHM]: RainfallWaterLevelConfig[];
  [DataSource.GLOFAS]: GlofasStationInfo[];
};

export type DataSourceConfig = {
  name: string;
  value: DataSourceValue;
  isPrivate: boolean;
};
