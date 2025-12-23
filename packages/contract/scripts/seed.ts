import { ethers } from "ethers";
import { SourceOracle } from "../shared-artifacts";
import { readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "../../database/generated/prisma";
import { datasourceSeedConfig } from "../../database/src/datasource-seed.config";

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

export const seedSources = async () => {
  const formattedData = formatSeedData(datasourceSeedConfig);

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

    console.log("Setting up sources for oracle contract...");

    for (const source of formattedData) {
      console.log(`Creating source: ${source.name}`);
      const tx = await oracleContract.createSource({
        name: source.name,
        value: source.value,
        unit: source.unit,
        decimal: source.decimal,
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
        const parsedLog = oracleContract.interface.parseLog(sourceCreatedEvent);
        const sourceBlockchainID = parsedLog?.args[0];
        const transactionHash = receipt.hash;

        console.log(
          `Source created with blockchain ID: ${sourceBlockchainID}, ${transactionHash}`
        );
      }
    }

    console.log("All sources created successfully!");
  } finally {
    await prisma.$disconnect();
  }
};

const formatSeedData = (dataSource: any) => {
  const results: any[] = [];

  Object.keys(dataSource.value).forEach((dataSourceKey) => {
    const dataSourceValue = dataSource.value[dataSourceKey];
    if (Array.isArray(dataSourceValue)) {
      dataSourceValue.forEach((sourceItem: any) => {
        const sourceItemKeys = Object.keys(sourceItem);
        const hasSourceTypeKeys = sourceItemKeys.some((key) => {
          const value = sourceItem[key];
          return (
            value &&
            typeof value === "object" &&
            (value.LOCATION || value.SERIESID)
          );
        });

        if (hasSourceTypeKeys) {
          sourceItemKeys.forEach((sourceTypeKey) => {
            const sourceTypeValue = sourceItem[sourceTypeKey];
            if (
              sourceTypeValue &&
              typeof sourceTypeValue === "object" &&
              sourceTypeValue.LOCATION
            ) {
              const location = sourceTypeValue.LOCATION.replace(/\s+/g, "_");
              const name = `${dataSourceKey}_${sourceTypeKey}_${location}`;
              let unit = "water_level_m";
              if (sourceTypeKey === "RAINFALL") {
                unit = "rainfall_mm";
              } else if (sourceTypeKey === "WATER_LEVEL") {
                unit = "water_level_m";
              }
              results.push({
                name: name,
                value: 0,
                unit: unit,
                decimal: 1000000,
              });
            }
          });
        } else if (sourceItem.LOCATION) {
          const location = sourceItem.LOCATION.replace(/\s+/g, "_");
          const name = `${dataSourceKey}_${location}`;
          const unit =
            dataSourceKey === "GLOFAS" ? "prob_flood" : "water_level_m";
          results.push({
            name: name,
            value: 0,
            unit: unit,
            decimal: 1000000,
          });
        } else if (
          sourceItem.RIVER_BASIN &&
          sourceItem.STATION_LOCATIONS_DETAILS
        ) {
          const riverBasin = sourceItem.RIVER_BASIN.replace(/\s+/g, "_");
          if (Array.isArray(sourceItem.STATION_LOCATIONS_DETAILS)) {
            sourceItem.STATION_LOCATIONS_DETAILS.forEach((station: any) => {
              if (station.STATION_NAME) {
                const stationName = station.STATION_NAME.replace(/\s+/g, "_");
                const name = `${dataSourceKey}_${riverBasin}_${stationName}`;
                const unit = "water_level_m";
                results.push({
                  name: name,
                  value: 0,
                  unit: unit,
                  decimal: 1000000,
                });
              }
            });
          }
        } else if (sourceItem.RIVER_BASIN) {
          const riverBasin = sourceItem.RIVER_BASIN.replace(/\s+/g, "_");
          const name = `${dataSourceKey}_${riverBasin}`;
          const unit =
            dataSourceKey === "GFH" ? "water_level_m" : "water_level_m";
          results.push({
            name: name,
            value: 0,
            unit: unit,
            decimal: 1000000,
          });
        }
      });
    }
  });
  return results;
};

// Run script
seedSources();
