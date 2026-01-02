import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { BQUEUE, JOBS } from '../constant';
import {
  CONTRACT_NAMES,
  deployments,
  getContractWithSigner,
} from '@lib/contracts';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@lib/database';
import type { TriggerContractWriter } from '../trigger/types';

type BlockchainCreatePhasePayload = {
  phaseUuid: string;
  name: string;
  threshold: number | string;
};

@Processor(BQUEUE.BLOCKCHAIN_TRANSFER)
export class CreatePhaseOnChainProcessor {
  private readonly logger = new Logger(CreatePhaseOnChainProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JOBS.BLOCKCHAIN.CREATE_PHASE)
  async handleCreatePhase(
    job: Job<BlockchainCreatePhasePayload>,
  ): Promise<void> {
    const { phaseUuid, name, threshold } = job.data;
    const contractAddress = deployments?.triggerContract;

    if (!contractAddress) {
      this.logger.error('Trigger contract address is not configured.');
      throw new Error('Trigger contract address missing.');
    }

    try {
      const contract = getContractWithSigner(
        CONTRACT_NAMES.trigger,
        contractAddress,
        this.configService,
      ) as unknown as TriggerContractWriter;

      const contractWithStaticCall = contract as any;
      const blockchainId = await contractWithStaticCall.createPhase.staticCall(
        name,
        BigInt(threshold),
      );

      const transactionResponse = await contract.createPhase(
        name,
        BigInt(threshold),
      );
      const transaction = transactionResponse as unknown as {
        hash: string;
        wait: () => Promise<unknown>;
      };
      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      const phase = await this.prisma.phase.findUnique({
        where: { uuid: phaseUuid },
      });

      if (!phase) {
        throw new Error(`Phase with UUID ${phaseUuid} not found`);
      }

      await this.prisma.phaseBlockchain.upsert({
        where: { phaseId: phase.id },
        update: {
          transactionHash: transaction.hash,
          blockchainId: blockchainId.toString(),
          chain: 'EVM',
        },
        create: {
          phaseId: phase.id,
          transactionHash: transaction.hash,
          blockchainId: blockchainId.toString(),
          chain: 'EVM',
        },
      });

      this.logger.log(
        `Phase ${phaseUuid} created on-chain. Tx hash: ${transaction.hash}, Blockchain ID: ${blockchainId.toString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create phase ${phaseUuid} on-chain`,
        error as Error,
      );
      throw error;
    }
  }
}
