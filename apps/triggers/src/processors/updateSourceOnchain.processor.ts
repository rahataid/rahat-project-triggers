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
  BlockchainUpdateSourceValueBatchPayload,
} from '../constant/updateSourceBlockchain';

@Processor(BQUEUE.BLOCKCHAIN_TRANSFER)
export class BlockchainProcessor {
  private readonly logger = new Logger(BlockchainProcessor.name);

  constructor(private readonly configService: ConfigService) {}

  @Process({
    name: JOBS.BLOCKCHAIN.UPDATE_SOURCE_VALUE_BATCH,
    concurrency: 1,
  })
  async handleUpdateSourceValueBatch(
    job: Job<BlockchainUpdateSourceValueBatchPayload>,
  ): Promise<void> {
    const { sources } = job.data;
    const contractAddress = (deployments as Record<string, string>)
      ?.oracleContract;

    if (!contractAddress) {
      this.logger.error('Oracle contract address is not configured.');
      throw new Error('Oracle contract address missing.');
    }

    this.logger.log(
      `Processing ${sources.length} source updates sequentially for on-chain update`,
    );

    for (const source of sources) {
      try {
        await this.processSingleSourceUpdate(source, contractAddress);
      } catch (error) {
        this.logger.error(
          `Failed to update source ${source.sourceId} value on-chain`,
          error as Error,
        );
      }
    }

    this.logger.log(
      `Completed processing ${sources.length} source updates for on-chain update`,
    );
  }

  private async processSingleSourceUpdate(
    source: { sourceId: number | string; value: number | string },
    contractAddress: string,
  ): Promise<void> {
    const decimal = await this.getDecimalOfSource(
      source.sourceId,
      contractAddress,
      this.configService,
    );

    const contract = getContractWithSigner(
      (CONTRACT_NAMES as Record<string, string>).oracle,
      contractAddress,
      this.configService,
    ) as unknown as SourceOracleContractWriter;

    const transaction = await contract.updateSourceValue(
      BigInt(source.sourceId),
      this.convertToBigInt(source.value, decimal),
    );

    await transaction.wait();
    this.logger.log(
      `Source ${source.sourceId} value updated on-chain. Tx hash: ${transaction.hash}`,
    );
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
