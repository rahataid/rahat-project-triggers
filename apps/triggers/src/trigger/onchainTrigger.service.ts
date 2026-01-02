import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, JOBS } from 'src/constant';
import type { Queue } from 'bull';
import { RpcException } from '@nestjs/microservices';
import { PrismaService, DataSource } from '@lib/database';
import {
  BlockchainBatchJobPayload,
  BlockchainActivateTriggerPayload,
  TriggerWithPhase,
} from './types';

@Injectable()
export class AddOnchainTriggerService {
  logger = new Logger(AddOnchainTriggerService.name);
  constructor(
    @InjectQueue(BQUEUE.BLOCKCHAIN_TRANSFER)
    private readonly addOnChainTriggerQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async addTriggersOnChain(
    triggersData: Array<{
      uuid: string;
      triggerStatement: any;
      source: DataSource | null;
      phaseId: string | null;
      phase: {
        name: any;
        riverBasin: string;
      } | null;
    }>,
  ) {
    try {
      const triggersForOnChain = this.mapTriggersForOnChain(triggersData);

      // Validate triggers
      const triggersWithData = await this.validateTriggers(triggersForOnChain);

      // Prepare payload for the on-chain processing
      const payload = this.prepareBatchPayload(triggersWithData);

      this.logger.log(
        `Queueing ${triggersData.length} triggers for sequential on-chain processing`,
      );

      // Queue the triggers for the on-chain processing
      await this.addOnChainTriggerQueue.add(
        JOBS.BLOCKCHAIN.ADD_TRIGGER_BATCH,
        payload,
      );
      this.logger.log(`${triggersData.length} triggers queued successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to queue blockchain job for triggers`,
        error as Error,
      );
      throw new RpcException('Unable to enqueue triggers for on-chain sync.');
    }
  }

  async updateTriggerOnChain(trigger: any): Promise<void> {
    try {
      if (!trigger || !trigger.uuid) {
        throw new RpcException('Trigger with UUID is required');
      }

      const payload: BlockchainActivateTriggerPayload = {
        triggerUuid: trigger.uuid,
      };

      this.logger.log(
        `Queueing trigger ${trigger.uuid} for on-chain activation`,
      );
      await this.addOnChainTriggerQueue.add(
        JOBS.BLOCKCHAIN.ACTIVATE_TRIGGER,
        payload,
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Trigger ${trigger.uuid} queued for on-chain activation`);
    } catch (error) {
      this.logger.error(
        `Failed to queue blockchain job for trigger activation`,
        error as Error,
      );
      throw new RpcException(
        'Unable to enqueue trigger for on-chain activation.',
      );
    }
  }

  private mapTriggersForOnChain(
    triggersData: Array<{
      uuid: string;
      triggerStatement: any;
      source: DataSource | null;
      phaseId: string | null;
      phase: {
        name: any;
        riverBasin: string;
      } | null;
    }>,
  ): TriggerWithPhase[] {
    return triggersData.map((trigger) => ({
      uuid: trigger.uuid,
      triggerStatement: trigger.triggerStatement as Record<string, any> | null,
      source: trigger.source || '',
      phaseId: trigger.phaseId || undefined,
      phase: trigger.phase
        ? {
            name: trigger.phase.name,
            riverBasin: trigger.phase.riverBasin,
          }
        : {
            name: '',
            riverBasin: null,
          },
    }));
  }

  private async validateTriggers(triggers: TriggerWithPhase[]): Promise<
    Array<{
      trigger: TriggerWithPhase;
      triggerRecord: {
        uuid: string;
        title: string | null;
        sourceType: 'MANUAL' | 'AUTOMATIC';
      };
      phase: {
        uuid: string;
        PhaseBlockchain: { blockchainId: string } | null;
      };
    }>
  > {
    return Promise.all(
      triggers.map(async (trigger) => {
        if (!trigger.phaseId) {
          throw new RpcException(
            `Phase ID is required for trigger ${trigger.uuid}`,
          );
        }

        const triggerRecord = await this.prisma.trigger.findUnique({
          where: { uuid: trigger.uuid },
        });

        if (!triggerRecord) {
          throw new RpcException(`Trigger ${trigger.uuid} not found`);
        }

        const phase = await this.prisma.phase.findUnique({
          where: { uuid: trigger.phaseId },
          include: {
            source: true,
            PhaseBlockchain: true,
          },
        });

        if (!phase) {
          throw new RpcException(`Phase ${trigger.phaseId} not found`);
        }

        const sourceType =
          triggerRecord.source === DataSource.MANUAL ? 'MANUAL' : 'AUTOMATIC';

        return {
          trigger,
          triggerRecord: {
            uuid: triggerRecord.uuid,
            title: triggerRecord.title,
            sourceType,
          },
          phase: {
            uuid: phase.uuid,
            PhaseBlockchain: phase.PhaseBlockchain
              ? {
                  blockchainId: phase.PhaseBlockchain.blockchainId,
                }
              : null,
          },
        };
      }),
    );
  }

  private prepareBatchPayload(
    triggersWithData: Array<{
      trigger: TriggerWithPhase;
      triggerRecord: {
        uuid: string;
        title: string | null;
        sourceType: 'MANUAL' | 'AUTOMATIC';
      };
      phase: {
        uuid: string;
        PhaseBlockchain: { blockchainId: string } | null;
      };
    }>,
  ): BlockchainBatchJobPayload {
    return {
      triggers: triggersWithData.map(({ trigger, triggerRecord, phase }) => ({
        uuid: trigger.uuid,
        triggerStatement: trigger.triggerStatement,
        source: trigger.source,
        phaseId: trigger.phaseId,
        phase: trigger.phase,
        triggerRecord,
        phaseData: {
          uuid: phase.uuid,
          PhaseBlockchain: phase.PhaseBlockchain,
        },
      })),
    };
  }
}
