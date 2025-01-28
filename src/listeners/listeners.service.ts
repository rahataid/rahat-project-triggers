import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// import { BQUEUE, EVENTS } from '../constants';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BQUEUE, EVENTS } from 'src/constant';

@Injectable()
export class ListernersService {
  private readonly logger = new Logger(ListernersService.name);

  constructor(
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
  ) {}

  @OnEvent(EVENTS.AUTOMATED_TRIGGERED)
  async handleAutomatedTrigger(payload: { repeatKey: string }) {
    const allJobs = await this.scheduleQueue.getRepeatableJobs();
    const targetJob = allJobs.find((j) => j.key === payload.repeatKey);
    await this.scheduleQueue.removeRepeatableByKey(targetJob.key);
    this.logger.log('Triggered automated job removed.');
    return;
  }
}
