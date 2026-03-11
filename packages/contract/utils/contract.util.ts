import { ethers } from "ethers";
import { Contract } from "./contract";

const DEFAULT_RPC_URL = "https://sepolia.infura.io/v3/YOUR_PROJECT_ID";
const DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d538ff944bacb478cbrd5efcae784d7bf4f2ff80";

export interface ConfigReader {
  getOrThrow<T = string>(key: string): T;
}

const getRpcUrl = (configService?: ConfigReader) => {
  if (configService) {
    return configService.getOrThrow<string>("RPC_URL");
  }
  return DEFAULT_RPC_URL;
};

const getPrivateKey = (configService?: ConfigReader) => {
  if (configService) {
    return configService.getOrThrow<string>("PRIVATE_KEY");
  }
  return DEFAULT_PRIVATE_KEY;
};

export const getSigner = (configService?: ConfigReader) => {
  const rpc = getRpcUrl(configService);
  const privateKey = getPrivateKey(configService);
  const provider = new ethers.JsonRpcProvider(rpc);
  return new ethers.Wallet(privateKey, provider);
};

export const getContractWithSigner = (
  contractName: string,
  contractAddress: string,
  configService?: ConfigReader
) => {
  const rpc = getRpcUrl(configService);
  const contractObj = new Contract(rpc);
  const contract = contractObj.getContract(contractName, contractAddress);
  const signer = getSigner(configService);
  return contract.connect(signer);
};
