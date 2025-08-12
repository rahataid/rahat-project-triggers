import { PrismaService } from '@rumsan/prisma';
import { PrismaClient, DataSource, SourceType } from '@prisma/client';
import { SettingsService } from '@rumsan/settings';
import { DataSourceConfig } from 'src/types/settings';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const settings = new SettingsService(prismaService);

const config: DataSourceConfig = {
  name: 'DATASOURCE',
  value: {
    [DataSource.DHM]: [
      {
        [SourceType.RAINFALL]: {
          LOCATION: 'Doda river at East-West Highway',
          SERIESID: [29785, 29608, 5726, 29689], // Jyamirkhali, AWS at Parsia, Santipur Belauri, Kallagoth (Krishnapur),
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: 'Doda river at East-West Highway',
          SERIESID: [29089],
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
        STATION_NAME: 'Doda river at East-West Highway',
        RIVER_GAUGE_ID: 'hybas_4120803470',
        RIVER_NAME: 'doda',
        STATION_ID: 'G10165',
        POINT_ID: 'SI002576',
        LISFLOOD_DRAINAGE_AREA: 432,
        'LISFLOOD_X_(DEG)': 80.425,
        'LISFLOOD_Y_[DEG]': 28.875,
        LATITUDE: 28.853,
        LONGITUDE: 80.434,
      },
    ],
  },
  isPrivate: false,
};

const main = async () => {
  try {
    const dataSource = await settings.getPublic('DATASOURCE');

    if (dataSource) {
      console.log('DATASOURCE already exists');
      await settings.delete('DATASOURCE');
      console.log('Old DATASOURCE deleted');
    }
    await settings.create(config);
  } catch (error) {
    await settings.create(config);
    console.log(`New DATASOURCE created for karnali`);
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.log(error);
    await prisma.$disconnect();
  });
