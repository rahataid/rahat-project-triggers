import { ethers } from "ethers";
import { SourceOracle, TriggerContract } from "../shared-artifacts";
import { readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  PrismaClient,
  SourceType,
  Phases,
} from "../../database/generated/prisma";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!RPC_URL) {
  throw new Error("RPC_URL environment variable is required");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const phases: Phases[] = [
  Phases.ACTIVATION,
  Phases.READINESS,
  Phases.PREPAREDNESS,
];

const getUnitFromType = (type: SourceType): string => {
  switch (type) {
    case SourceType.WATER_LEVEL:
      return "m";
    case SourceType.RAINFALL:
      return "mm";
    default:
      return "m";
  }
};

export const seedSources = async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL!);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    const deploymentsPath = path.join(__dirname, "deployments.json");
    if (!existsSync(deploymentsPath)) {
      throw new Error(
        "deployments.json not found. Please deploy contracts first."
      );
    }

    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    const oracleAddress = deployments.oracleContract;

    if (!oracleAddress) {
      throw new Error("oracleContract address not found in deployments.json");
    }

    const oracleContract = new ethers.Contract(
      oracleAddress,
      SourceOracle.abi,
      wallet
    ) as ethers.Contract & {
      createSource: (input: {
        name: string;
        value: number;
        unit: string;
        decimal: number;
      }) => Promise<ethers.ContractTransactionResponse>;
    };

    console.log("Fetching sourcesData from database...");
    const sourcesData = await prisma.sourcesData.findMany({
      where: {
        onChainRef: null,
      },
    });

    console.log(`Found ${sourcesData.length} sourcesData entries to process`);

    for (const sourceData of sourcesData) {
      if (!sourceData.dataSource || !sourceData.stationRef) {
        console.log(
          `Skipping sourcesData ${sourceData.id}: missing dataSource or stationRef`
        );
        continue;
      }

      const dataSource = sourceData.dataSource;
      const type = sourceData.type;
      const stationRef = sourceData.stationRef;
      const name = `${dataSource}_${type}_${stationRef}`;
      const unit = getUnitFromType(type);

      try {
        const tx = await oracleContract.createSource({
          name: name,
          value: 0,
          unit: unit,
          decimal: 1000000,
        });
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error("Transaction receipt is null");
        }

        const sourceCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const parsedLog = oracleContract.interface.parseLog(log);
            return parsedLog?.name === "SourceCreated";
          } catch {
            return false;
          }
        });

        if (sourceCreatedEvent) {
          const parsedLog =
            oracleContract.interface.parseLog(sourceCreatedEvent);
          const sourceBlockchainID = parsedLog?.args[0];

          await prisma.sourcesData.update({
            where: { id: sourceData.id },
            data: {
              onChainRef: sourceBlockchainID.toString(),
            },
          });

          console.log(
            `✅ Source created with blockchain ID: ${sourceBlockchainID} and updated in database`
          );
        } else {
          console.log(`⚠️  SourceCreated event not found for ${name}`);
        }
      } catch (error: any) {
        console.error(`❌ Error creating source ${name}:`, error.message);
      }
    }

    console.log("All sources processed!");
  } finally {
    await prisma.$disconnect();
  }
};

export const seedPhases = async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL!);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    const deploymentsPath = path.join(__dirname, "deployments.json");
    if (!existsSync(deploymentsPath)) {
      throw new Error(
        "deployments.json not found. Please deploy contracts first."
      );
    }

    const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
    const triggerAddress = deployments.triggerContract;

    console.log(triggerAddress, "is trigger address");

    if (!triggerAddress) {
      throw new Error("triggerContract address not found in deployments.json");
    }

    const triggerContract = new ethers.Contract(
      triggerAddress,
      TriggerContract.abi,
      wallet
    ) as ethers.Contract & {
      createPhase: (
        name: string,
        uuid: string,
        threshold: number
      ) => Promise<ethers.ContractTransactionResponse>;
    };

    console.log("Fetching phases from database...");
    const dbPhases = await prisma.phase.findMany({
      where: {
        PhaseBlockchain: null,
        name: {
          in: phases,
        },
      },
      select: {
        id: true,
        uuid: true,
        name: true,
        requiredMandatoryTriggers: true,
      },
    });

    console.log(`Found ${dbPhases.length} phases to process`);

    for (const phase of dbPhases) {
      const name = phase.name;
      const uuid = phase.uuid;
      const threshold = phase.requiredMandatoryTriggers ?? 0;

      console.log(`Creating phase: ${name} (${uuid})`);

      try {
        const tx = await triggerContract.createPhase(name, uuid, threshold);
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error("Transaction receipt is null");
        }

        const phaseCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const parsedLog = triggerContract.interface.parseLog(log);
            return parsedLog?.name === "PhaseCreated";
          } catch {
            return false;
          }
        });

        if (phaseCreatedEvent) {
          const parsedLog =
            triggerContract.interface.parseLog(phaseCreatedEvent);
          const phaseBlockchainID = parsedLog?.args[0];

          console.log(
            `✅ Phase created with blockchain ID: ${phaseBlockchainID} and updated in database`
          );
        } else {
          console.log(`⚠️  PhaseCreated event not found for ${name}`);
        }
      } catch (error: any) {
        console.error(`❌ Error creating phase ${name}:`, error.message);
      }
    }

    console.log("All phases processed!");
  } finally {
    await prisma.$disconnect();
  }
};

// Run script
seedSources();
// seedPhases();
