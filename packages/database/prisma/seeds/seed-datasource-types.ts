import { PrismaClient } from '../../generated/prisma';
import { DataSourceTypesSetting } from '../../index';
const prisma = new PrismaClient();

const config: DataSourceTypesSetting = {
  name: 'DATASOURCETYPES',
  value: {
    ['GLOFAS']: {
      type: 'prob_flood',
      subtypes: [
        'two_years_max_prob',
        'five_years_max_prob',
        'twenty_years_max_prob',
      ],
    },
    ['DHM:RAINFALL']: {
      type: 'rainfall_mm',
      subtypes: ['hourly', 'daily'],
    },
    ['DHM:WATERLEVEL']: {
      type: 'water_level_m',
      subtypes: ['warning_level', 'danger_level'],
    },
  },
  isPrivate: false,
};

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding DATASOURCE TYPES');
  console.log('#'.repeat(30));

  try {
    const dataSourceTypes = await prisma.setting.findUnique({
      where: { name: config.name },
    });

    if (dataSourceTypes) {
      console.log('DataSource Types already exists');
      await prisma.setting.delete({
        where: { name: config.name },
      });
      console.log('Old DATASOURCE TYPES deleted');
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
