import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();
const appUuid = null; // Replace with actual app UUID for HEATWAVE project


const heatwaveCategories: string[] = [
  'Health and Care',
  'Early Warning Communication',
  'PGI',
  'Risk Reduction, climate adaptation and Recovery',
  'Cash Transfer',
  'CEA',
  'National Society Strengthening',
];

async function seedCategories(appId: string) {
  try {
    for (const category of heatwaveCategories) {
      await prisma.activityCategory.upsert({
        where: {
          app_name: {
            name: category,
            app: appId,
          },
        },
        update: {
          name: category,
        },
        create: {
          app: appId,
          name: category,
        },
      });
    }
  } catch (error) {
    console.error('Error seeding heatwave categories:', error);
  } finally {
    console.log('#'.repeat(30));
    console.log('Seeding HEATWAVE CATEGORIES completed');
    console.log('#'.repeat(30));
  }
}

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding HEATWAVE CATEGORIES');

  try {
    if (!appUuid) {
      throw new Error(
        'App UUID for HEATWAVE project is not defined. Please set the appUuid variable with the correct UUID.',
      );
    }
    await seedCategories(appUuid);
  } catch (error: any) {
    console.error('Error seeding heatwave categories:', error);
  }
};

main()
  .then(async () => {})
  .catch(async (error) => {
    console.log('#'.repeat(30));
    console.log(error);
    console.log('#'.repeat(30));
  })
  .finally(async () => {
    console.log('\n');
    await prisma.$disconnect();
  });
