import { DataSource, SourceType } from '../generated/prisma';
import { DataSourceType } from './nestjs/types';

export const datasourceSeedConfig: DataSourceType = {
  name: 'DATASOURCE',
  value: {
    [DataSource.DHM]: [
      {
        [SourceType.RAINFALL]: {
          LOCATION: 'Doda river at East-West Highway',
          SERIESID: [29785, 29608, 5726, 29689],
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: 'Doda river at East-West Highway',
          SERIESID: [1508],
        },
      },
      {
        [SourceType.RAINFALL]: {
          LOCATION: 'karnali river at chisapani',
          SERIESID: [29785, 29608, 5726, 29689],
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: 'karnali river at chisapani',
          SERIESID: [1508],
        },
      },
    ],
    [DataSource.GLOFAS]: [
      {
        LOCATION: 'Doda river at East-West Highway',
        URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
        BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317', //bounding box for karnali at chisapani
        I: '227', //coordinate for station
        J: '67',
        TIMESTRING: '2023-10-01T00:00:00Z',
      },
    ],
    [DataSource.GFH]: [
      {
        RIVER_BASIN: 'Doda river at East-West Highway',
        STATION_LOCATIONS_DETAILS: [
          {
            STATION_NAME: 'Doda River Basin',
            RIVER_GAUGE_ID: 'hybas_4120803470',
            RIVER_NAME: 'doda',
            STATION_ID: 'G10165',
            POINT_ID: 'SI002576',
            LISFLOOD_DRAINAGE_AREA: 432,
            'LISFLOOD_X_(DEG)': 80.422917,
            'LISFLOOD_Y_[DEG]': 28.84375,
            LATITUDE: 28.84375,
            LONGITUDE: 80.422917,
          },
          {
            STATION_NAME: 'Sarda River Basin',
            RIVER_NAME: 'doda',
            STATION_ID: 'G10166',
            POINT_ID: 'SI002576',
            LISFLOOD_DRAINAGE_AREA: 432,
            'LISFLOOD_X_(DEG)': 80.422917,
            'LISFLOOD_Y_[DEG]': 28.84375,
            LATITUDE: 28.84375,
            LONGITUDE: 80.422917,
          },
        ],
      },
    ],
  },
  isPrivate: false,
};
