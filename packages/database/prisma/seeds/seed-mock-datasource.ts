import {
  PrismaClient,
  Prisma,
  DataSource,
  SourceType,
} from '../../generated/prisma';
import { DataSourceType } from '../../index';

const prisma = new PrismaClient();

const config: DataSourceType = {
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
          SERIESID: [29089],
        },
      },
      {
        [SourceType.RAINFALL]: {
          LOCATION: 'Karnali river at Chisapani',
          SERIESID: [29785, 29608, 5726, 29689],
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: 'Karnali river at Chisapani',
          SERIESID: [29089],
        },
      },
    ],
    [DataSource.GLOFAS]: [
      {
        LOCATION: 'Doda river at East-West Highway',
        URL: 'http://localhost:3005/v1/forecast/glofas',
        BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
        I: '227',
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

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding MOCK DATASOURCE');
  console.log('#'.repeat(30));
  try {
    const dataSource = await prisma.mockSetting.findUnique({
      where: { name: 'DATASOURCE' },
    });

    if (dataSource) {
      console.log('MOCK DATASOURCE already exists');
      await prisma.mockSetting.delete({
        where: { name: 'DATASOURCE' },
      });
      console.log('Old MOCK DATASOURCE deleted');
    }
    await prisma.mockSetting.create({
      data: {
        name: config.name,
        value: config.value as unknown as Prisma.InputJsonValue,
        isPrivate: config.isPrivate,
        dataType: 'OBJECT',
        requiredFields: [],
        isReadOnly: false,
      },
    });
    console.log('✅ Mock DATASOURCE created successfully');
  } catch (error: any) {
    console.error('❌ Error creating mock datasource:', error);
    await prisma.mockSetting.create({
      data: {
        name: config.name,
        value: config.value as unknown as Prisma.InputJsonValue,
        isPrivate: config.isPrivate,
        dataType: 'OBJECT',
        requiredFields: [],
        isReadOnly: false,
      },
    });
  }
};

main()
  .catch(async (error) => {
    console.log('#'.repeat(30));
    console.log('Error during seeding MOCK DATASOURCE');
    console.log(error);
    console.log('#'.repeat(30));
  })
  .finally(async () => {
    console.log('#'.repeat(30));
    console.log('Mock seeding completed for DATASOURCE');
    console.log('#'.repeat(30));
    console.log('\n');
    await prisma.$disconnect();
  });
