import { PrismaClient, DataSource, SourceType } from '../../generated/prisma';
import { DataSourceConfigType } from '../../index';
const prisma = new PrismaClient();

const config: DataSourceConfigType = {
  name: 'DATASOURCECONFIG',
  value: {
    [DataSource.DHM]: {
      [SourceType.RAINFALL]: {
        URL: 'http://localhost:3005/v1/forecast/river',
      },
      [SourceType.WATER_LEVEL]: {
        URL: 'http://localhost:3005/v1/forecast/river',
      },
    },
    [DataSource.GLOFAS]: {
      URL: 'http://localhost:3005/v1/forecast/glofas',
    },
    [DataSource.GFH]: {
      URL: 'http://localhost:3005/v1/forecast/gauges:queryGaugeForecasts',
    },
  },
  isPrivate: false,
};

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding MOCK DATASOURCE CONFIG');
  console.log('#'.repeat(30));

  try {
    const dataSource = await prisma.mockSetting.findUnique({
      where: { name: config.name },
    });

    if (dataSource) {
      console.log('Mock DataSource Config already exists');
      await prisma.mockSetting.delete({
        where: { name: config.name },
      });
      console.log('Old MOCK DATASOURCE CONFIG deleted');
    }
    await prisma.mockSetting.create({
      data: {
        name: config.name,
        value: config.value,
        isPrivate: config.isPrivate,
        dataType: 'OBJECT',
        requiredFields: [],
        isReadOnly: false,
      },
    });
    console.log('✅ Mock DataSource Config created successfully');
  } catch (error: any) {
    console.error('❌ Error creating mock datasource config:', error);
    await prisma.mockSetting.create({
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
    console.log('Mock seeding completed');
    console.log('#'.repeat(30));
    console.log('\n');
    await prisma.$disconnect();
  });
