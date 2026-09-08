import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@lib/database';
import { BQUEUE, JOBS } from 'src/constant';
import {
  CreateTriggerCallbackDto,
  GetTriggerCallbackLogsDto,
  RemoveTriggerCallbackDto,
  UpdateTriggerCallbackDto,
} from './dto';
import { parseCallbackConfig } from './validation/callback-config.schema';
import type { CallbackDispatchJobData, TriggerCallbackContext } from './types';

@Injectable()
export class TriggerCallbackService {
  private readonly logger = new Logger(TriggerCallbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BQUEUE.TRIGGER_CALLBACK)
    private readonly callbackQueue: Queue,
  ) {}

  async create(dto: CreateTriggerCallbackDto) {
    try {
      parseCallbackConfig(dto.type, dto.config);

      const trigger = await this.prisma.trigger.findUnique({
        where: { uuid: dto.triggerId },
      });
      if (!trigger) {
        throw new RpcException('Trigger not found.');
      }

      return await this.prisma.triggerCallback.create({
        data: {
          triggerId: dto.triggerId,
          type: dto.type,
          name: dto.name,
          config: dto.config,
          isActive: dto.isActive ?? true,
          order: dto.order ?? 0,
          createdBy: dto.createdBy,
        },
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async findAllForTrigger(triggerId: string) {
    return this.prisma.triggerCallback.findMany({
      where: { triggerId, isDeleted: false },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(uuid: string) {
    const callback = await this.prisma.triggerCallback.findUnique({
      where: { uuid },
    });
    if (!callback || callback.isDeleted) {
      throw new RpcException('Trigger callback not found.');
    }
    return callback;
  }

  async update(dto: UpdateTriggerCallbackDto) {
    try {
      const existing = await this.findOne(dto.uuid);

      const type = dto.type ?? existing.type;
      const config = dto.config ?? existing.config;
      parseCallbackConfig(type, config);

      return await this.prisma.triggerCallback.update({
        where: { uuid: dto.uuid },
        data: {
          type: dto.type,
          name: dto.name,
          config: dto.config,
          isActive: dto.isActive,
          order: dto.order,
        },
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async remove(dto: RemoveTriggerCallbackDto) {
    await this.findOne(dto.uuid);
    return this.prisma.triggerCallback.update({
      where: { uuid: dto.uuid },
      data: { isDeleted: true },
    });
  }

  async getLogs(dto: GetTriggerCallbackLogsDto) {
    await this.findOne(dto.callbackId);
    return this.prisma.triggerCallbackLog.findMany({
      where: { callbackId: dto.callbackId },
      orderBy: { startedAt: 'desc' },
    });
  }

  buildContext(
    trigger: {
      uuid: string;
      repeatKey: string;
      title: string | null;
      logicKey: string | null;
      source: string | null;
      isMandatory: boolean;
      triggeredBy: string | null;
      triggerStatement: unknown;
      triggeredAt: Date | null;
      phase?: {
        uuid: string;
        name: string;
        activeYear: string;
        riverBasin: string;
      } | null;
    },
    appId?: string,
  ): TriggerCallbackContext {
    return {
      event: 'trigger.activated',
      triggeredAt: (trigger.triggeredAt ?? new Date()).toISOString(),
      trigger: {
        uuid: trigger.uuid,
        repeatKey: trigger.repeatKey,
        title: trigger.title,
        logicKey: trigger.logicKey,
        source: trigger.source,
        isMandatory: trigger.isMandatory,
        triggeredBy: trigger.triggeredBy,
        triggerStatement: trigger.triggerStatement,
      },
      phase: trigger.phase
        ? {
            uuid: trigger.phase.uuid,
            name: trigger.phase.name,
            activeYear: trigger.phase.activeYear,
            riverBasin: trigger.phase.riverBasin,
          }
        : null,
      appId,
    };
  }

  /** Fire-once dispatch: enqueues every active callback attached to a trigger. Safe to call more than once. */
  async enqueueForTrigger(triggerUuid: string, appId?: string) {
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: { uuid: triggerUuid },
        include: { phase: true },
      });

      if (!trigger) {
        this.logger.warn(
          `Trigger ${triggerUuid} not found; skipping callback dispatch`,
        );
        return;
      }

      const callbacks = await this.prisma.triggerCallback.findMany({
        where: { triggerId: trigger.uuid, isActive: true, isDeleted: false },
        orderBy: { order: 'asc' },
      });

      if (!callbacks.length) return;

      const context = this.buildContext(trigger, appId);

      for (const callback of callbacks) {
        await this.claimAndEnqueue(callback.uuid, triggerUuid, appId, context);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue callbacks for trigger ${triggerUuid}: ${error.message}`,
      );
    }
  }

  private async claimAndEnqueue(
    callbackUuid: string,
    triggerUuid: string,
    appId: string | undefined,
    context: TriggerCallbackContext,
  ) {
    // Atomic claim: only the caller that flips dispatchedAt from null wins the enqueue,
    // so a re-fired trigger (or a concurrent call) never double-sends a callback.
    const claimed = await this.prisma.triggerCallback.updateMany({
      where: { uuid: callbackUuid, dispatchedAt: null },
      data: { dispatchedAt: new Date() },
    });

    if (claimed.count !== 1) {
      this.logger.debug(
        `Callback ${callbackUuid} already dispatched; skipping`,
      );
      return;
    }

    const jobData: CallbackDispatchJobData = {
      callbackUuid,
      triggerUuid,
      appId,
      context,
    };

    await this.callbackQueue.add(JOBS.TRIGGER.CALLBACK_DISPATCH, jobData, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async replay(callbackUuid: string) {
    try {
      const callback = await this.prisma.triggerCallback.findUnique({
        where: { uuid: callbackUuid },
        include: { trigger: { include: { phase: true } } },
      });

      if (!callback || callback.isDeleted) {
        throw new RpcException('Trigger callback not found.');
      }

      if (!callback.trigger.isTriggered) {
        throw new RpcException(
          'Cannot replay a callback for a trigger that has not fired.',
        );
      }

      await this.prisma.triggerCallback.update({
        where: { uuid: callbackUuid },
        data: { dispatchedAt: null },
      });

      const context = this.buildContext(callback.trigger);
      await this.claimAndEnqueue(
        callback.uuid,
        callback.triggerId,
        undefined,
        context,
      );

      return { queued: true };
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  /** Carries callbacks over to the trigger re-created during a phase revert, re-armed for the next fire. */
  async cloneForNewTrigger(oldTriggerId: string, newTriggerId: string) {
    const callbacks = await this.prisma.triggerCallback.findMany({
      where: { triggerId: oldTriggerId, isDeleted: false },
    });

    if (!callbacks.length) return;

    await this.prisma.triggerCallback.createMany({
      data: callbacks.map((callback) => ({
        triggerId: newTriggerId,
        type: callback.type,
        name: callback.name,
        config: callback.config as any,
        isActive: callback.isActive,
        order: callback.order,
        createdBy: callback.createdBy,
      })),
    });
  }
}
