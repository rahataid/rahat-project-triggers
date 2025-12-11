import { PrismaService } from '@rumsan/prisma';
import { PrismaClient, DataSource, SourceType } from '@prisma/client';
import { SettingsService } from '@rumsan/settings';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const settings = new SettingsService(prismaService);

const config = {
  name: 'DATASOURCECONFIG',
  value: {
    [DataSource.DHM]: {
      [SourceType.RAINFALL]: {
        URL: 'http://www.dhm.gov.np/frontend_dhm/hydrology/getRainfallWatchMapBySeriesId',
      },
      [SourceType.WATER_LEVEL]: {
        URL: 'https://dhm.gov.np/site/getRiverWatchBySeriesId_Single',
      },
    },
    [DataSource.GLOFAS]: {
      URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
    },
    [DataSource.GFH]: {
      URL: 'https://floodforecasting.googleapis.com/v1',
    },
  },
  isPrivate: false,
};

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding DATASOURCE CONFIG');
  console.log('#'.repeat(30));

  try {
    const dataSource = await settings.getPublic(config.name);

    if (dataSource) {
      console.log('DataSource Config already exists');
      await settings.delete(config.name);
      console.log('Old DATASOURCE CONFIG deleted');
    }
    await settings.create(config);
  } catch (error) {
    await settings.create(config);
    console.log(`New DATASOURCE CONFIG`);
  }
};

main()
  .then(async () => {})
  .catch(async (error) => {
    console.log(error);
  })
  .finally(async () => {
    console.log('#'.repeat(30));
    console.log('Seeding completed');
    console.log('#'.repeat(30));
    console.log('\n');
    await prisma.$disconnect();
  });
