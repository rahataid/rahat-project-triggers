// Script to validate and update logicKey for triggers in tbl_triggers

import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

function generateRandomKey(length = 16): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

const main = async () => {
  console.log('#'.repeat(30));
  console.log('Checking Trigger logicKey');
  console.log('#'.repeat(30));

  const triggers = await prisma.trigger.findMany();
  let updatedCount = 0;

  for (const trigger of triggers) {
    if (!trigger.logicKey) {
      const logicKey = generateRandomKey();
      await prisma.trigger.update({
        where: { id: trigger.id },
        data: { logicKey },
      });
      console.log(`Updated trigger id=${trigger.id} with logicKey=${logicKey}`);
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    console.log('All triggers already have a logicKey.');
  } else {
    console.log(`Updated ${updatedCount} triggers with new logicKey.`);
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
