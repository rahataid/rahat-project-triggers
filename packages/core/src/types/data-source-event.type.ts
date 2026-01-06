import { DataSource, SourceType } from '@lib/database';
import { Indicator } from './indicator.type';

type NestedRecord<T> = T[keyof T];

export const DATA_SOURCE_EVENTS = {
  DHM: {
    WATER_LEVEL: 'events.data-source.dhm.water-level',
    RAINFALL: 'events.data-source.dhm.rainfall',
  },
  GLOFAS: {
    WATER_LEVEL: 'events.data-source.glofas.water-level',
  },
  GFH: {
    WATER_LEVEL: 'events.data-source.gfh.water-level',
  },
} as const;

export type DataSourceEventName = NestedRecord<
  NestedRecord<typeof DATA_SOURCE_EVENTS>
>;

export type DataSourceEventPayload = {
  readonly dataSource: DataSource;
  readonly sourceType: SourceType;
  readonly fetchedAt: string;
  readonly indicators: Indicator[];
};
