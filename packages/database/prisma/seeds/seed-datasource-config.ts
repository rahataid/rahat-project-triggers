import { PrismaClient, DataSource, SourceType } from '../../generated/prisma';
import { DataSourceConfigType } from '../../index';
const prisma = new PrismaClient();

const config: DataSourceConfigType = {
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
    const dataSource = await prisma.setting.findUnique({
      where: { name: config.name },
    });

    if (dataSource) {
      console.log('DataSource Config already exists');
      await prisma.setting.delete({
        where: { name: config.name },
      });
      console.log('Old DATASOURCE CONFIG deleted');
    }
    await prisma.setting.create({
      data: {
        name: config.name,
        value: config.value,
        isPrivate: config.isPrivate,
        dataType: 'OBJECT',
        requiredFields: [],
        isReadOnly: false,
      },
    });
  } catch (error: any) {
    await prisma.setting.create({
      data: {
        name: config.name,
        value: config.value,
        isPrivate: config.isPrivate,
        dataType: 'OBJECT',
        requiredFields: [],
        isReadOnly: false,
      },
    });
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
