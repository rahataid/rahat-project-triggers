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

export type RainfallWaterLevelConfig = Omit<
  Record<
    keyof typeof SourceType,
    {
      LOCATION: string;
      SERIESID: number[];
    }
  >,
  'PROB_FLOOD'
>;

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

export type DataSourceKey = 'GLOFAS' | 'DHM:RAINFALL' | 'DHM:WATERLEVEL';

export type DataSourceTypesValue = {
  type: string;
  subtypes: string[];
};

export type DataSourceTypes = Record<DataSourceKey, DataSourceTypesValue>;

export type DataSourceTypesSetting = {
  name: string;
  value: DataSourceTypes;
  isPrivate: boolean;
};
