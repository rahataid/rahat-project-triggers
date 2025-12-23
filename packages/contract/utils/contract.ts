import { ethers, Interface, InterfaceAbi } from "ethers";
import artifacts from "../shared-artifacts";

export class Contract {
  constructor(private readonly network: string) {}

  public getContract(contractName: string, contractAddress: string) {
    try {
      const provider = new ethers.JsonRpcProvider(this.network);
      const abi = this.getAbi(contractName);
      return new ethers.Contract(contractAddress, abi, provider);
    } catch (error) {
      throw new Error(
        `Error: ${error instanceof Error ? error.message : error}, message: Cannot instantiate contract`
      );
    }
  }

  public getInterface(contractName: string) {
    try {
      const abi = this.getAbi(contractName);
      return new Interface(abi);
    } catch (error) {
      throw new Error(
        `Error: ${error instanceof Error ? error.message : error}, message: Cannot instantiate contract`
      );
    }
  }

  private getAbi(contractName: string) {
    const artifact = (artifacts as Record<string, { abi: InterfaceAbi }>)[
      contractName
    ];
    if (!artifact) {
      throw new Error(`Artifact not found for contract: ${contractName}`);
    }
    return artifact.abi;
  }
}
