import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Logger } from '@nestjs/common';
import { BQUEUE, JOBS, CORE_MODULE } from 'src/constant';
import { lastValueFrom } from 'rxjs';

@Processor(BQUEUE.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(@Inject(CORE_MODULE) private readonly client: ClientProxy) {}

  @Process(JOBS.NOTIFICATION.CREATE)
  async handleNotification(job: Job) {
    const payload = job.data;
    try {
      this.logger.log(`🚀 Processing notification job: ${payload}`);
      const rdata = await lastValueFrom(
        this.client.send({ cmd: 'rahat.jobs.notification.create' }, payload),
      );
      console.log(rdata);
      this.logger.log(`✅ Notification delivered: ${rdata}`);
    } catch (error) {
      this.logger.error(
        `❌ Notification job failed: ${JOBS.NOTIFICATION.CREATE}`,
        error.stack,
      );
      throw error;
    }
  }
}
