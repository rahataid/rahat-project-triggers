import { GfhStationDetails } from './gfh-station.type';
import { DataSource, SourceType } from '../../../index';

export type GlofasStationInfo = {
  LOCATION: string;
  I: string;
  J: string;
  URL: string;
  BBOX: string;
  TIMESTRING: string;
};

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
  [DataSource.GFH]?: GfhStationDetails[];
};

export type DataSourceType = {
  name: string;
  value: DataSourceValue;
  isPrivate: boolean;
};
