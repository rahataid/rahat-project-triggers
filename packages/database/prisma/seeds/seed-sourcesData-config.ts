import {
  PrismaClient,
  Prisma,
  DataSource,
  SourceType,
} from '../../generated/prisma';
import { datasourceSeedConfig } from '../../src/datasource-seed.config';

const prisma = new PrismaClient();

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding SOURCES DATA');
  console.log('#'.repeat(30));

  try {
    const config = datasourceSeedConfig.value;
    console.log(
      `Using datasourceSeedConfig with ${Object.keys(config).length} data sources`,
    );

    if (config[DataSource.DHM] && Array.isArray(config[DataSource.DHM])) {
      for (const sourceItem of config[DataSource.DHM]) {
        const sourceItemKeys = Object.keys(sourceItem) as SourceType[];

        for (const sourceType of sourceItemKeys) {
          const sourceTypeValue = (sourceItem as any)[sourceType];

          if (
            sourceTypeValue &&
            sourceTypeValue.LOCATION &&
            Array.isArray(sourceTypeValue.SERIESID)
          ) {
            const location = sourceTypeValue.LOCATION;
            const riverBasin = location.replace(/\s+/g, '_');

            for (const seriesId of sourceTypeValue.SERIESID) {
              const stationRef = seriesId.toString();

              const existingRecord = await prisma.sourcesData.findFirst({
                where: {
                  type: sourceType,
                  dataSource: DataSource.DHM,
                  source: {
                    riverBasin,
                  },
                  stationRef,
                },
              });

              if (existingRecord) {
                console.log(
                  `SourcesData already exists for DHM ${sourceType} ${location} seriesId: ${seriesId}`,
                );
                continue;
              }

              const info = {};

              const existingSource = await prisma.source.findUnique({
                where: { riverBasin },
              });

              if (!existingSource) {
                console.log(
                  `⚠️  Source not found for ${riverBasin}, skipping SourcesData creation`,
                );
                continue;
              }

              await prisma.sourcesData.create({
                data: {
                  type: sourceType,
                  dataSource: DataSource.DHM,
                  info: info as Prisma.InputJsonValue,
                  stationRef,
                  source: {
                    connect: {
                      id: existingSource.id,
                    },
                  },
                },
              });

              console.log(
                `✅ Created SourcesData for DHM ${sourceType} ${location} seriesId: ${seriesId}`,
              );
            }
          }
        }
      }
    }

    if (config[DataSource.GLOFAS] && Array.isArray(config[DataSource.GLOFAS])) {
      for (const glofasItem of config[DataSource.GLOFAS]) {
        const glofas = glofasItem as any;
        if (glofas.LOCATION) {
          const location = glofas.LOCATION;
          const riverBasin = location.replace(/\s+/g, '_');

          const existingRecord = await prisma.sourcesData.findFirst({
            where: {
              type: SourceType.WATER_LEVEL,
              dataSource: DataSource.GLOFAS,
              source: {
                riverBasin,
              },
            },
          });

          if (existingRecord) {
            console.log(`SourcesData already exists for GLOFAS ${location}`);
            continue;
          }

          const info = {};

          const existingSource = await prisma.source.findUnique({
            where: { riverBasin },
          });

          if (!existingSource) {
            console.log(
              `⚠️  Source not found for ${riverBasin}, skipping SourcesData creation`,
            );
            continue;
          }

          await prisma.sourcesData.create({
            data: {
              type: SourceType.WATER_LEVEL,
              dataSource: DataSource.GLOFAS,
              info: info as Prisma.InputJsonValue,
              source: {
                connect: {
                  id: existingSource.id,
                },
              },
            },
          });

          console.log(`✅ Created SourcesData for GLOFAS ${location}`);
        }
      }
    }

    const gfhConfig = config[DataSource.GFH];
    if (gfhConfig && Array.isArray(gfhConfig)) {
      for (const gfhItem of gfhConfig) {
        if (!gfhItem) continue;
        const gfh = gfhItem as any;
        if (gfh.RIVER_BASIN && Array.isArray(gfh.STATION_LOCATIONS_DETAILS)) {
          const riverBasin = gfh.RIVER_BASIN.replace(/\s+/g, '_');

          for (const station of gfh.STATION_LOCATIONS_DETAILS) {
            if (station.STATION_NAME) {
              const existingRecord = await prisma.sourcesData.findFirst({
                where: {
                  type: SourceType.WATER_LEVEL,
                  dataSource: DataSource.GFH,
                  source: {
                    riverBasin,
                  },
                  info: {
                    path: ['stationName'],
                    equals: station.STATION_NAME,
                  },
                },
              });

              if (existingRecord) {
                console.log(
                  `SourcesData already exists for GFH ${gfh.RIVER_BASIN} ${station.STATION_NAME}`,
                );
                continue;
              }

              const info = {};

              const existingSource = await prisma.source.findUnique({
                where: { riverBasin },
              });

              if (!existingSource) {
                console.log(
                  `⚠️  Source not found for ${riverBasin}, skipping SourcesData creation for ${station.STATION_NAME}`,
                );
                continue;
              }

              await prisma.sourcesData.create({
                data: {
                  type: SourceType.WATER_LEVEL,
                  dataSource: DataSource.GFH,
                  info: info as Prisma.InputJsonValue,
                  source: {
                    connect: {
                      id: existingSource.id,
                    },
                  },
                },
              });

              console.log(
                `✅ Created SourcesData for GFH ${gfh.RIVER_BASIN} ${station.STATION_NAME}`,
              );
            }
          }
        } else if (gfh.RIVER_BASIN && !gfh.STATION_LOCATIONS_DETAILS) {
          const riverBasin = gfh.RIVER_BASIN.replace(/\s+/g, '_');

          const existingRecord = await prisma.sourcesData.findFirst({
            where: {
              type: SourceType.WATER_LEVEL,
              dataSource: DataSource.GFH,
              source: {
                riverBasin,
              },
            },
          });

          if (existingRecord) {
            console.log(
              `SourcesData already exists for GFH ${gfh.RIVER_BASIN}`,
            );
            continue;
          }

          const info = {};

          const existingSource = await prisma.source.findUnique({
            where: { riverBasin },
          });

          if (!existingSource) {
            console.log(
              `⚠️  Source not found for ${riverBasin}, skipping SourcesData creation`,
            );
            continue;
          }

          await prisma.sourcesData.create({
            data: {
              type: SourceType.WATER_LEVEL,
              dataSource: DataSource.GFH,
              info: info as Prisma.InputJsonValue,
              source: {
                connect: {
                  id: existingSource.id,
                },
              },
            },
          });

          console.log(`✅ Created SourcesData for GFH ${gfh.RIVER_BASIN}`);
        }
      }
    }

    console.log('#'.repeat(30));
    console.log('✅ Seeding completed for SOURCES DATA');
    console.log('#'.repeat(30));
  } catch (error: any) {
    console.log('#'.repeat(30));
    console.log('❌ Error during seeding SOURCES DATA');
    console.log(error);
    console.log('#'.repeat(30));
    throw error;
  }
};

main()
  .catch(async (error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('\n');
    await prisma.$disconnect();
  });
