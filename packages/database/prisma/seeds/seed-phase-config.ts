import { PrismaClient, Prisma, Phases } from '../../generated/prisma';

const prisma = new PrismaClient();

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Seeding PHASES');
  console.log('#'.repeat(30));

  try {
    const source = await prisma.source.findFirst({
      select: {
        riverBasin: true,
      },
    });

    if (!source) {
      console.log('⚠️  No sources found. Please seed sources first.');
      return;
    }

    const currentYear = new Date().getFullYear().toString();
    const phaseNames: Phases[] = [
      Phases.PREPAREDNESS,
      Phases.READINESS,
      Phases.ACTIVATION,
    ];
    for (const phaseName of phaseNames) {
      const existingPhase = await prisma.phase.findUnique({
        where: {
          riverBasin_activeYear_name: {
            riverBasin: source.riverBasin,
            activeYear: currentYear,
            name: phaseName,
          },
        },
      });

      if (existingPhase) {
        console.log(
          `Phase ${phaseName} already exists for ${source.riverBasin} in year ${currentYear}`,
        );
        continue;
      }

      await prisma.phase.create({
        data: {
          name: phaseName,
          activeYear: currentYear,
          requiredMandatoryTriggers: 1,
          requiredOptionalTriggers: 1,
          receivedMandatoryTriggers: 0,
          receivedOptionalTriggers: 0,
          canRevert: true,
          canTriggerPayout: true,
          isActive: true,
          source: {
            connect: {
              riverBasin: source.riverBasin,
            },
          },
        },
      });

      console.log(
        `✅ Created phase ${phaseName} for ${source.riverBasin} in year ${currentYear}`,
      );
    }

    console.log('#'.repeat(30));
    console.log('✅ Seeding completed for PHASES');
    console.log('#'.repeat(30));
  } catch (error: any) {
    console.log('#'.repeat(30));
    console.log('❌ Error during seeding PHASES');
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
