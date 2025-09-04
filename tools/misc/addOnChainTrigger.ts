import axios from 'axios';
import { PrismaClient } from '@prisma/client';

interface AddTriggerJobDto {
  id: string;
  trigger_type: string; // "MANDATORY" | "OPTIONAL"
  phase: string;
  title: string;
  description?: string;
  source: string; // DataSource enum value as string
  river_basin: string;
  params: any; // triggerStatement JSON
  is_mandatory: boolean;
  notes?: string | null;
}

const prisma = new PrismaClient();

const BATCH_SIZE = 2;
const ONCHAIN_ENDPOINT =
  'http://localhost:5500/v1/projects/ab4881c6-5fcb-4cf4-ba87-fec5e0a8c13d/actions';

const config = {
  accessToken: '',
};

async function fetchUnchainedTriggers() {
  return prisma.trigger.findMany({
    where: {
      transactionHash: null,
      isDeleted: false,
    },
    include: {
      phase: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

function buildJobPayloads(triggers: any[]): AddTriggerJobDto[] {
  return triggers
    .filter((t) => !!t.phase) // ensure phase relation exists
    .map((t) => {
      const payload: AddTriggerJobDto = {
        id: t.uuid,
        trigger_type: t.isMandatory ? 'MANDATORY' : 'OPTIONAL',
        phase: t.phase.name,
        title: t.title,
        description: t.description || undefined,
        source: t.source, // already enum string in DB
        river_basin: t.phase.riverBasin,
        params: JSON.parse(JSON.stringify(t.triggerStatement || {})),
        is_mandatory: t.isMandatory,
        notes: t.notes,
      };
      return payload;
    });
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sendBatch(batch: AddTriggerJobDto[]) {
  const dryRun = process.env.DRY_RUN === 'true';
  if (dryRun) {
    console.log(
      `DRY_RUN enabled. Would POST batch of ${batch.length} triggers to ${ONCHAIN_ENDPOINT}`,
    );
    return;
  }

  // const action = {
  //   action: 'aa.stellar.addTriggerOnChain',
  //   // payload: { triggers: batch },
  //   payload: {
  //     triggers: batch,
  //   },
  // };
  // try {
  //   const res = await axios.post(ONCHAIN_ENDPOINT, action, {
  //     timeout: 30_000,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${config.accessToken}`,
  //     },
  //   });
  //   console.log(
  //     `Posted batch of ${batch.length} triggers. Status: ${res.status} ${res.statusText}`,
  //   );
  // } catch (err: any) {
  //   console.error('Failed to POST batch:', err?.response?.data || err.message);
  //   // You might want to rethrow or implement retry logic here.
  // }
}

async function main() {
  console.log('Fetching triggers without transactionHash...');
  const triggers = await fetchUnchainedTriggers();
  console.log(
    `Found ${triggers.length} triggers (including those without phase).`,
  );

  const jobs = buildJobPayloads(triggers);
  console.log(`Prepared ${jobs.length} AddTriggerJobDto payload(s).`);

  if (!jobs.length) return;

  const batches = chunk(jobs, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}...`);
    await sendBatch(batches[i]);
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
}

main()
  .catch((e) => {
    console.error('Error running addOnChainTrigger script:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
