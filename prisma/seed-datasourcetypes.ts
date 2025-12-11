import { PrismaService } from '@rumsan/prisma';
import { SettingsService } from '@rumsan/settings';

const prismaService = new PrismaService();
const settings = new SettingsService(prismaService);

const dataSourceTypes = {
  name: 'DATASOURCETYPES',
  value: {
    GFH: {
      type: 'discharge_m3s',
      subtypes: ['warning_discharge', 'danger_discharge'],
    },
    GLOFAS: {
      type: 'prob_flood',
      subtypes: ['2_years_max_prob', '5_years_max_prob', '20_years_max_prob'],
    },
    'DHM:RAINFALL': {
      type: 'rainfall_mm',
      subtypes: ['hourly', 'daily'],
    },
    'DHM:WATERLEVEL': {
      type: 'water_level_m',
      subtypes: ['warning_level', 'danger_level'],
    },
    'DAILY MONITORING': {},
    DHM: {},
  },
  isPrivate: false,
};

async function main() {
  console.log('Seeding DATASOURCETYPES...');

  const existing = await settings.getPublic('DATASOURCETYPES');

  if (existing) {
    console.log('Existing DATASOURCETYPES found → updating...');
    await settings.delete('DATASOURCETYPES');
  }

  await settings.create(dataSourceTypes);
  console.log('DATASOURCETYPES created successfully!');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
  })
  .finally(async () => {
    await prismaService.$disconnect();
  });
