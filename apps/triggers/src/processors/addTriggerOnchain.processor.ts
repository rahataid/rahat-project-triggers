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
  BlockchainBatchJobPayload,
  TriggerContractWriter,
} from '../trigger/types';
import { TriggerService } from '../trigger/trigger.service';

@Processor(BQUEUE.BLOCKCHAIN_TRANSFER)
export class AddTriggerOnchainProcessor {
  private readonly logger = new Logger(AddTriggerOnchainProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly triggerService: TriggerService,
  ) {}

  @Process(JOBS.BLOCKCHAIN.ADD_TRIGGER_BATCH)
  async handleAddTriggerBatch(
    job: Job<BlockchainBatchJobPayload>,
  ): Promise<void> {
    const { triggers } = job.data;
    const contractAddress = deployments?.triggerContract;

    if (!contractAddress) {
      this.logger.error('Trigger contract address is not configured.');
      throw new Error('Trigger contract address missing.');
    }

    this.logger.log(
      `Processing ${triggers.length} triggers sequentially for on-chain creation`,
    );

    for (const trigger of triggers) {
      try {
        const contract = getContractWithSigner(
          CONTRACT_NAMES.trigger,
          contractAddress,
          this.configService,
        ) as unknown as TriggerContractWriter;

        await this.processSingleTrigger(trigger, contract);
      } catch (error) {
        this.logger.error(
          `Failed to add trigger ${trigger.uuid} on-chain`,
          error as Error,
        );
      }
    }

    this.logger.log(
      `Completed processing ${triggers.length} triggers for on-chain creation`,
    );
  }

  private async processSingleTrigger(
    trigger: BlockchainBatchJobPayload['triggers'][0],
    contract: TriggerContractWriter,
  ): Promise<void> {
    if (!trigger.phaseId || !trigger.phaseData) {
      throw new Error(
        `Phase ID or phase data missing for trigger ${trigger.uuid}`,
      );
    }

    const phaseUuid = trigger.phaseData.uuid;
    const triggerUuidParam = trigger.uuid;
    const triggerName = trigger.triggerRecord.title || trigger.uuid;

    // Map sourceType to contract enum: MANUAL = 0, AUTOMATIC = 1
    const triggerType = trigger.triggerRecord.sourceType === 'MANUAL' ? 0 : 1;

    // Set sourceId: 0 for MANUAL, 1 for AUTOMATIC
    const sourceBlockchainId =
      trigger.triggerRecord.sourceType === 'MANUAL' ? 0n : 1n;

    // Set threshold: 0 for MANUAL, use triggerStatement value for AUTOMATIC
    let threshold = 0n;
    if (trigger.triggerRecord.sourceType === 'AUTOMATIC') {
      if (!trigger.triggerStatement?.value) {
        throw new Error(
          `Trigger statement value missing for automatic trigger ${trigger.uuid}`,
        );
      }
      threshold = BigInt(trigger.triggerStatement.value);
    }

    const contractWithStaticCall = contract as any;
    const blockchainId = await contractWithStaticCall.createTrigger.staticCall(
      triggerType,
      phaseUuid,
      triggerUuidParam,
      sourceBlockchainId,
      threshold,
      triggerName,
    );

    const transactionResponse = await contract.createTrigger(
      triggerType,
      phaseUuid,
      triggerUuidParam,
      sourceBlockchainId,
      threshold,
      triggerName,
    );

    const transaction = transactionResponse as unknown as {
      hash: string;
      wait: () => Promise<unknown>;
    };
    const receipt = await transaction.wait();

    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    await this.triggerService.updateTransaction({
      uuid: trigger.uuid,
      transactionHash: transaction.hash,
    });

    this.logger.log(
      `Trigger ${trigger.uuid} created on-chain. Tx hash: ${transaction.hash}, Blockchain ID: ${blockchainId.toString()}`,
    );
  }
}
