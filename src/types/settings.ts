import { DataSource, SourceType } from '@prisma/client';
import { GlofasStationInfo } from 'src/sources-data/dto';
import { GfhStationDetails } from './data-source';

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
  [DataSource.GLOFAS]: GlofasStationInfo[];
  [DataSource.GFH]?: GfhStationDetails[];
};

export type DataSourceConfig = {
  name: string;
  value: DataSourceValue;
  isPrivate: boolean;
};
