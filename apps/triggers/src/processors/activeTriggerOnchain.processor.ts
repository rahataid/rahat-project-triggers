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
import type {
  BlockchainActivateTriggerPayload,
  TriggerContractWriter,
} from '../trigger/types';

@Processor(BQUEUE.BLOCKCHAIN_TRANSFER)
export class ActiveTriggerOnchainProcessor {
  private readonly logger = new Logger(ActiveTriggerOnchainProcessor.name);

  constructor(private readonly configService: ConfigService) {}

  @Process(JOBS.BLOCKCHAIN.ACTIVATE_TRIGGER)
  async handleActivateTrigger(
    job: Job<BlockchainActivateTriggerPayload>,
  ): Promise<void> {
    const { triggerUuid } = job.data;
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
      const triggerData =
        await contractWithStaticCall.getTriggerByUuid(triggerUuid);

      if (!triggerData || triggerData.id === 0n) {
        throw new Error(`Trigger with UUID ${triggerUuid} not found on-chain`);
      }

      if (triggerData.triggered) {
        this.logger.warn(
          `Trigger ${triggerUuid} (blockchain ID: ${triggerData.id}) is already triggered on-chain`,
        );
        return;
      }

      const transaction = await contract.activateTrigger(triggerData.id);
      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      this.logger.log(
        `Trigger ${triggerUuid} (blockchain ID: ${triggerData.id}) activated on-chain. Tx hash: ${transaction.hash}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to activate trigger ${triggerUuid} on-chain`,
        error as Error,
      );
      throw error;
    }
  }
}
