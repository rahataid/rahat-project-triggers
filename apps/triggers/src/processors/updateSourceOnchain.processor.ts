import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { BQUEUE, JOBS } from '../constant';
import {
  CONTRACT_NAMES,
  deployments,
  getContractWithSigner,
  Contract,
} from '@lib/contracts';
import { ConfigService } from '@nestjs/config';
import type {
  SourceOracleContractWriter,
  SourceOracleContractReader,
  BlockchainUpdateSourceValuePayload,
} from '../constant/updateSourceBlockchain';

@Processor(BQUEUE.BLOCKCHAIN_TRANSFER)
export class BlockchainProcessor {
  private readonly logger = new Logger(BlockchainProcessor.name);

  constructor(private readonly configService: ConfigService) {}

  @Process(JOBS.BLOCKCHAIN.UPDATE_SOURCE_VALUE)
  async handleUpdateSourceValue(
    job: Job<BlockchainUpdateSourceValuePayload>,
  ): Promise<void> {
    const { sourceId, value } = job.data;
    const contractAddress = (deployments as Record<string, string>)
      ?.oracleContract;

    if (!contractAddress) {
      this.logger.error('Oracle contract address is not configured.');
      throw new Error('Oracle contract address missing.');
    }

    try {
      const decimal = await this.getDecimalOfSource(
        sourceId,
        contractAddress,
        this.configService,
      );

      const contract = getContractWithSigner(
        (CONTRACT_NAMES as Record<string, string>).oracle,
        contractAddress,
        this.configService,
      ) as unknown as SourceOracleContractWriter;

      const transaction = await contract.updateSourceValue(
        BigInt(sourceId),
        this.convertToBigInt(value, decimal),
      );

      await transaction.wait();
      this.logger.log(
        `Source ${sourceId} value updated on-chain. Tx hash: ${transaction.hash}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update source ${sourceId} value on-chain`,
        error as Error,
      );
      throw error;
    }
  }

  private convertToBigInt = (
    value: number | string,
    decimal: number,
  ): bigint => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const multiplied = numValue * decimal;
    const integerValue = Math.floor(multiplied);
    return BigInt(integerValue);
  };

  private getDecimalOfSource = async (
    sourceId: number | string,
    contractAddress: string,
    configService: ConfigService,
  ): Promise<number> => {
    const rpc = configService.getOrThrow<string>('RPC_URL');
    const contractObj = new Contract(rpc);
    const contract = contractObj.getContract(
      (CONTRACT_NAMES as Record<string, string>).oracle,
      contractAddress,
    ) as unknown as SourceOracleContractReader;

    const source = await contract.getSource(BigInt(sourceId));

    return Number(source[5] as bigint);
  };
}
