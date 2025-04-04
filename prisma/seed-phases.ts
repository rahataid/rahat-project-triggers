import { PrismaClient, Phases } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  const activeYear = process.env.ACTIVE_YEAR;

  try {
    if (!activeYear) {
      throw new Error('ACTIVE_YEAR is not set in env');
    }

    const source = await prisma.source.findMany({});
    JSON.parse(activeYear).forEach((year: number) => {
      source.forEach(async (source) => {
        [Phases.PREPAREDNESS, Phases.ACTIVATION, Phases.READINESS].forEach(
          async (phase) => {
            await prisma.phase.upsert({
              create: {
                activeYear: year.toString(),
                source: { connect: { riverBasin: source.riverBasin } },
                name: phase,
              },
              where: {
                riverBasin_activeYear_name: {
                  riverBasin: source.riverBasin,
                  name: phase,
                  activeYear: year.toString(),
                },
              },
              update: {
                source: { connect: { riverBasin: source.riverBasin } },
                name: phase,
                activeYear: year.toString(),
              },
            });
          },
        );
      });
    });
    console.log('Phases created successfully');
  } catch (error) {
    console.log(`Error creating phases: ${error}`);
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
