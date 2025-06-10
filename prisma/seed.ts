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
          LOCATION: 'Karnali at Chisapani',
          SERIESID: 13067,
        },
        [SourceType.WATER_LEVEL]: {
          LOCATION: 'Mahakali',
          SERIESID: 29089,
        },
      },
    ],
    [DataSource.GLOFAS]: [{
      LOCATION: 'Karnali at Chisapani',
      URL: "https://ows.globalfloods.eu/glofas-ows/ows.py",
      BBOX: "8753364.64714296,3117815.425733483,9092541.220653716,3456991.999244238",
      I: '721',
      J: '303',
      TIMESTRING: ''
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
