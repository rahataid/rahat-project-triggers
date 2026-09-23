/*
T_1H = Air Temperature 1 Hour Average
TX_1D = Air Temperature Daily Max
RH_1H =  Relative Humidity 1 hour average

Nepalgunj Airport: 
T_1H: 5847
TX_1D: 5842
RH_1H: 5844

Dhangadi Airport:
T_1H: 7532
TX_1D: 7526
RH_1H: 7528

Bhairahwa AWOS:
T_1H: 14565
TX_1D: 14562
RH_1H: 14546

Biratnagar Airport:
T_1H: 6127
TX_1D: 6120
RH_1H: 6123
*/
import {
  PrismaClient,
  Prisma,
  DataSource,
  SourceType,
} from '../../generated/prisma';
import { DataSourceType } from '../../index';

const prisma = new PrismaClient();

const HeatwaveStations = [
  {
    LOCATION: 'Nepalgunj Airport',
    SERIESID: [5847, 5842, 5844],
  },
  {
    LOCATION: 'Dhangadi Airport',
    SERIESID: [7532, 7526, 7528],
  },
  {
    LOCATION: 'Bhairahwa AWOS',
    SERIESID: [14565, 14562, 14546],
  },
  {
    LOCATION: 'Biratnagar Airport',
    SERIESID: [6127, 6120, 6123],
  },
];

const config: DataSourceType = {
  name: 'DATASOURCE',
  value: {
    [DataSource.DHM]: [
      ...HeatwaveStations.map((station) => ({
        [SourceType.RAINFALL]: {
          LOCATION: station.LOCATION,
          SERIESID: [], // for heatwave we won't have rainfall data, so keeping it empty
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: station.LOCATION,
          SERIESID: [], // for heatwave we won't have water level data, so keeping it empty
        },
        [SourceType.TEMPERATURE]: {
          LOCATION: station.LOCATION,
          SERIESID: station.SERIESID,
        },
      })), // Map to create entries for RAINFALL, WATER_LEVEL, and TEMPERATURE with the same LOCATION and SERIESID
    ],
    [DataSource.GLOFAS]: [], // Keeping it empty for now, can be populated with actual GLOFAS station data
    [DataSource.GFH]: [],
  },
  isPrivate: false,
};

async function seedSource(tx: any) {
  console.log('#'.repeat(30));
  console.log('Seeding tbl_sources for heatwave datasource');
  console.log('#'.repeat(30));

  for (const station of HeatwaveStations) {
    const existingSource = await tx.source.findUnique({
      where: {
        riverBasin: station.LOCATION, // for heatwave riverBasin field will be used to store LOCATION
      },
    });

    if (existingSource) {
      console.log(`Source for ${station.LOCATION} already exists. Skipping...`);
      continue;
    }

    await tx.source.create({
      data: {
        riverBasin: station.LOCATION, // for heatwave riverBasin field will be used to store LOCATION
        source: ['DHM'],
      },
    });

    // create default phases for each source
    await Promise.all(
      ['PREPAREDNESS', 'READINESS'].map(async (phase) => {
        await tx.phase.upsert({
          where: {
            riverBasin_activeYear_name: {
              riverBasin: station.LOCATION,
              activeYear: '2026',
              name: phase,
            },
          },
          update: {
            name: phase,
          },
          create: {
            riverBasin: station.LOCATION,
            name: phase,
            activeYear: '2026',
          },
        });
      }),
    );

    console.log(`Source for ${station.LOCATION} created successfully.`);
  }
}

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding MOCK DATASOURCE');
  console.log('#'.repeat(30));
  try {
    await prisma.$transaction(async (tx) => {
      const dataSource = await tx.setting.findUnique({
        where: { name: 'DATASOURCE' },
      });

      if (dataSource) {
        console.log('MOCK DATASOURCE already exists');
        await tx.setting.delete({
          where: { name: 'DATASOURCE' },
        });
        console.log('Old MOCK DATASOURCE deleted');
      }

      await tx.setting.create({
        data: {
          name: config.name,
          value: config.value as unknown as Prisma.InputJsonValue,
          isPrivate: config.isPrivate,
          dataType: 'OBJECT',
          requiredFields: [],
          isReadOnly: false,
        },
      });

      await seedSource(tx);

      console.log('Seed datasource created successfully');
    });
  } catch (error: any) {
    console.error('❌ Error creating datasource:', error);
    throw error;
  }
};

main()
  .catch(async (error) => {
    console.log('#'.repeat(30));
    console.log('Error during seeding DATASOURCE');
    console.log(error);
    console.log('#'.repeat(30));
  })
  .finally(async () => {
    console.log('#'.repeat(30));
    console.log('Seeding completed for DATASOURCE');
    console.log('#'.repeat(30));
    console.log('\n');
    await prisma.$disconnect();
  });
