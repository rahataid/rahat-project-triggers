import { ethers } from "ethers";
import { TriggerContract, SourceOracle } from "../shared-artifacts";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL) {
  throw new Error("RPC_URL environment variable is required");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

export const deployTriggerContract = async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL!);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);

  console.log("Deploying oracle contract...");
  const oracleFactory = new ethers.ContractFactory(
    SourceOracle.abi,
    SourceOracle.bytecode,
    wallet
  );

  const oracleContract = await oracleFactory.deploy();
  const oracleAddress = await oracleContract.getAddress();
  await oracleContract.waitForDeployment();

  console.log("Deploying TriggerContract...");

  const triggerFactory = new ethers.ContractFactory(
    TriggerContract.abi,
    TriggerContract.bytecode,
    wallet
  );

  const triggerContract = await triggerFactory.deploy(oracleAddress);
  const triggerAddress = await triggerContract.getAddress();
  await triggerContract.waitForDeployment();

  console.log("Deployment complete!");

  const addrOutputPath = path.join(__dirname, "deployments.json");

  let deployments: Record<string, string> = {};
  if (existsSync(addrOutputPath)) {
    const existingData = readFileSync(addrOutputPath, "utf-8");
    deployments = JSON.parse(existingData);
  }

  deployments.triggerContract = triggerAddress;
  deployments.oracleContract = oracleAddress;

  writeFileSync(addrOutputPath, JSON.stringify(deployments, null, 2));
  console.log("Contract address saved to:", addrOutputPath);
};

// Run scriptp
deployTriggerContract();
