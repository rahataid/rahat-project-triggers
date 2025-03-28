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
          location: 'Babai at Chepang',
          url: 'https://bipadportal.gov.np/api/v1',
        },
        GLOFAS: {
          location: 'Babai at Chepang',
          url: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          bbox: '9066450.71499904,3117815.425733483,9405627.288509797,3456991.999244238',
          i: '89', //coordinate for station
          j: '409',
        },
      },
      isPrivate: false,
    });
  } catch (error) {
    await settings.create({
      name: 'DATASOURCE',
      value: {
        DHM: {
          location: 'Babai at Chepang',
          url: 'https://bipadportal.gov.np/api/v1',
        },
        GLOFAS: {
          location: 'Babai at Chepang',
          url: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          bbox: '9066450.71499904,3117815.425733483,9405627.288509797,3456991.999244238',
          i: '89', //coordinate for station
          j: '409',
        },
      },
      isPrivate: false,
    });
    console.log(`New DATASOURCE created fro babai`);
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
