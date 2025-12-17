import { PrismaClient } from '../../generated/prisma';
import { GfhApiKeyType } from '../../src/nestjs';

const prisma = new PrismaClient();
const config: GfhApiKeyType = {
  name: 'GFHAPIKEY',
  value: {
    API_KEY: 'AIzaSyC_5LUv3k3A',
  },
  isPrivate: false,
};

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding GFH API KEY');
  console.log('#'.repeat(30));

  try {
    const gfhApiKey = await prisma.setting.findUnique({
      where: { name: config.name },
    });

    if (gfhApiKey) {
      console.log('GFH API KEY already exists');
      await prisma.setting.delete({
        where: { name: config.name },
      });
      console.log('Old GFH API KEY deleted');
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

    console.log('GFH API KEY seeded successfully');
  } catch (error: any) {
    console.error('Error seeding GFH API KEY:', error);
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
