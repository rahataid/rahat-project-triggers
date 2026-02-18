import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Logger } from '@nestjs/common';
import { BQUEUE, JOBS, CORE_MODULE } from 'src/constant';
import { catchError, lastValueFrom, timeout } from 'rxjs';

@Processor(BQUEUE.NOTIFICATION_TRIGGER)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(@Inject(CORE_MODULE) private readonly client: ClientProxy) {}

  @Process(JOBS.NOTIFICATION.CREATE)
  async handleNotification(job: Job) {
    const payload = job.data;
    try {
      this.logger.log(`🚀 Processing notification job: ${payload}`);
      const rdata = await lastValueFrom(
        this.client
          .send({ cmd: 'rahat.jobs.notification.create' }, payload)
          .pipe(
            timeout(30000),
            catchError((error) => {
              this.logger.error(
                `Microservice call failed for notification job:`,
                error,
              );
              throw error;
            }),
          ),
      );
      this.logger.log(`✅ Notification delivered: ${rdata}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Notification job failed: ${JOBS.NOTIFICATION.CREATE}`,
        error.stack,
      );
      throw error;
    }
  }
}
