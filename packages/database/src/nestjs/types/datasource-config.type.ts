import { DataSource, SourceType } from '../../../index';

export type URLConfig = {
  URL: string;
};

export type DataSourceDHMConfig = {
  [SourceType.RAINFALL]: URLConfig;
  [SourceType.WATER_LEVEL]: URLConfig;
};

export type DataSourceConfigValue = {
  [DataSource.DHM]: DataSourceDHMConfig;
  [DataSource.GLOFAS]: URLConfig;
  [DataSource.GFH]?: URLConfig;
};

export type DataSourceConfigType = {
  name: string;
  value: DataSourceConfigValue;
  isPrivate: boolean;
};
