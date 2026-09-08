import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ClientProxy } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { createHmac } from 'crypto';
import { PrismaService, TriggerCallbackStatus, TriggerCallbackType } from '@lib/database';
import { BQUEUE, CORE_MODULE, JOBS } from 'src/constant';
import { parseCallbackConfig } from './validation/callback-config.schema';
import type {
  ActivityCommunicationConfig,
  CallbackDispatchJobData,
  InternalEventConfig,
  MsEventConfig,
  WebhookConfig,
} from './types';

@Injectable()
export class TriggerCallbackDispatcher {
  private readonly logger = new Logger(TriggerCallbackDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CORE_MODULE) private readonly client: ClientProxy,
    @InjectQueue(BQUEUE.COMMUNICATION)
    private readonly communicationQueue: Queue,
  ) {}

  async dispatch(job: CallbackDispatchJobData, attempt: number) {
    const callback = await this.prisma.triggerCallback.findUnique({
      where: { uuid: job.callbackUuid },
    });

    if (!callback || callback.isDeleted) {
      this.logger.warn(
        `Callback ${job.callbackUuid} not found or deleted; skipping dispatch`,
      );
      return;
    }

    const log = await this.prisma.triggerCallbackLog.create({
      data: {
        callbackId: callback.uuid,
        triggerId: job.triggerUuid,
        attempt,
        status: TriggerCallbackStatus.PENDING,
        request: job.context as any,
      },
    });

    const startedAt = Date.now();

    try {
      const response = await this.run(callback.type, callback.config, job);

      await this.prisma.triggerCallbackLog.update({
        where: { uuid: log.uuid },
        data: {
          status: TriggerCallbackStatus.SUCCESS,
          response: response ?? {},
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Callback ${callback.uuid} (${callback.type}) failed on attempt ${attempt}: ${error.message}`,
      );

      await this.prisma.triggerCallbackLog.update({
        where: { uuid: log.uuid },
        data: {
          status: TriggerCallbackStatus.FAILED,
          error: error.message?.slice(0, 2000) ?? 'Unknown error',
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      });

      // rethrow so Bull retries the job per its backoff config
      throw error;
    }
  }

  private async run(
    type: TriggerCallbackType,
    config: unknown,
    job: CallbackDispatchJobData,
  ): Promise<Record<string, any>> {
    switch (type) {
      case TriggerCallbackType.ACTIVITY_COMMUNICATION:
        return this.runActivityCommunication(
          parseCallbackConfig(type, config) as ActivityCommunicationConfig,
          job,
        );
      case TriggerCallbackType.WEBHOOK:
        return this.runWebhook(
          parseCallbackConfig(type, config) as WebhookConfig,
          job,
        );
      case TriggerCallbackType.MS_EVENT:
        return this.runMsEvent(
          parseCallbackConfig(type, config) as MsEventConfig,
          job,
        );
      case TriggerCallbackType.INTERNAL_EVENT:
        return this.runInternalEvent(
          parseCallbackConfig(type, config) as InternalEventConfig,
          job,
        );
      default:
        throw new Error(`Unsupported callback type: ${type}`);
    }
  }

  private async runActivityCommunication(
    config: ActivityCommunicationConfig,
    job: CallbackDispatchJobData,
  ) {
    const activity = await this.prisma.activity.findUnique({
      where: { uuid: config.activityUuid },
    });

    if (!activity) {
      throw new Error(`Activity ${config.activityUuid} not found`);
    }

    const allComms = JSON.parse(
      JSON.stringify(activity.activityCommunication ?? []),
    ) as Array<{ communicationId: string }>;

    const selected = config.communicationIds?.length
      ? allComms.filter((c) =>
          config.communicationIds.includes(c.communicationId),
        )
      : allComms;

    if (!selected.length) {
      throw new Error(
        `No matching communications found on activity ${config.activityUuid}`,
      );
    }

    const appId = config.appId ?? job.appId ?? activity.app;

    for (const comm of selected) {
      await this.communicationQueue.add(
        JOBS.ACTIVITIES.COMMUNICATION.TRIGGER,
        {
          communicationId: comm.communicationId,
          activityId: activity.uuid,
          appId,
        },
        {
          attempts: 3,
          removeOnComplete: true,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
    }

    return {
      enqueued: selected.length,
      communicationIds: selected.map((c) => c.communicationId),
    };
  }

  private async runWebhook(
    config: WebhookConfig,
    job: CallbackDispatchJobData,
  ) {
    const body = job.context;
    const serializedBody = JSON.stringify(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Rahat-Event': body.event,
      ...config.headers,
    };

    if (config.secret) {
      const timestamp = Date.now().toString();
      const signature = createHmac('sha256', config.secret)
        .update(`${timestamp}.${serializedBody}`)
        .digest('hex');
      headers['X-Rahat-Timestamp'] = timestamp;
      headers['X-Rahat-Signature'] = `sha256=${signature}`;
    }

    const response = await this.httpService.axiosRef.request({
      url: config.url,
      method: config.method,
      headers,
      data: config.includePayload ? body : undefined,
      timeout: config.timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return { status: response.status, data: response.data };
  }

  private async runMsEvent(
    config: MsEventConfig,
    job: CallbackDispatchJobData,
  ) {
    const appId = config.appId ?? job.appId;

    const result = await firstValueFrom(
      this.client
        .send(
          { cmd: config.cmd, uuid: appId },
          { ...config.payload, ...job.context },
        )
        .pipe(timeout(30000)),
    );

    return { result };
  }

  private async runInternalEvent(
    config: InternalEventConfig,
    job: CallbackDispatchJobData,
  ) {
    this.eventEmitter.emit(config.event, config.payload ?? job.context);
    return { emitted: config.event };
  }
}
