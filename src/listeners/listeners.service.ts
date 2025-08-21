import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// import { BQUEUE, EVENTS } from '../constants';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BQUEUE, EVENTS, JOBS } from 'src/constant';

@Injectable()
export class ListernersService {
  private readonly logger = new Logger(ListernersService.name);

  constructor(
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
    @InjectQueue(BQUEUE.NOTIFICATION) private readonly notificationQueue: Queue,
  ) {}

  @OnEvent(EVENTS.AUTOMATED_TRIGGERED)
  async handleAutomatedTrigger(payload: { repeatKey: string }) {
    const allJobs = await this.scheduleQueue.getRepeatableJobs();
    const targetJob = allJobs.find((j) => j.key === payload.repeatKey);
    await this.scheduleQueue.removeRepeatableByKey(targetJob.key);
    this.logger.log('Triggered automated job removed.');
    return;
  }

  @OnEvent(EVENTS.NOTIFICATION.CREATE)
  async handleNotification(event: { payload: any }) {
    console.log(event);
    const { payload } = event;
    try {
      this.logger.log(`✅ Notification event emitted`);

      this.notificationQueue.add(JOBS.NOTIFICATION.CREATE, payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(`✅ Notification job queued`);
    } catch (error) {
      console.error('❌ Notification emit failed:', error);
      throw error;
    }
  }
}
