import { PrismaService } from '@rumsan/prisma';
import { PrismaClient } from '@prisma/client';
import { SettingsService } from '@rumsan/settings';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const settings = new SettingsService(prismaService);

const main = async () => {
  try {
    const dataSource = await settings.getPublic('DATASOURCE');

    if (dataSource) {
      console.log('DATASOURCE already exists');
      await settings.delete('DATASOURCE');
      console.log('Old DATASOURCE deleted');
    }

    await settings.create({
      name: 'DATASOURCE',
      value: {
        DHM: {
          location: 'Karnali at Chisapani',
          url: 'https://bipadportal.gov.np/api/v1',
        },
        GLOFAS: {
          location: 'Karnali at Chisapani',
          url: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          bbox: '8753364.64714296,3117815.425733483,9092541.220653716,3456991.999244238', //bounding box for karnali at chisapani
          i: '721',
          j: '303',
        },
      },
      isPrivate: false,
    });
  } catch (error) {
    console.error(`Error seeding settings`, error);
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
