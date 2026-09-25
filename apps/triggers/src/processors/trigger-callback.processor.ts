import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { BQUEUE, JOBS } from '../constant';
import { TriggerCallbackDispatcher } from '../trigger-callback/trigger-callback.dispatcher';
import type { CallbackDispatchJobData } from '../trigger-callback/types';

@Processor(BQUEUE.TRIGGER_CALLBACK)
export class TriggerCallbackProcessor {
  private readonly logger = new Logger(TriggerCallbackProcessor.name);

  constructor(private readonly dispatcher: TriggerCallbackDispatcher) {}

  @Process(JOBS.TRIGGER.CALLBACK_DISPATCH)
  async processCallbackDispatch(job: Job<CallbackDispatchJobData>) {
    this.logger.log(
      `Dispatching callback ${job.data.callbackUuid} for trigger ${job.data.triggerUuid} (attempt ${job.attemptsMade + 1})`,
    );

    await this.dispatcher.dispatch(job.data, job.attemptsMade + 1);
  }
}
