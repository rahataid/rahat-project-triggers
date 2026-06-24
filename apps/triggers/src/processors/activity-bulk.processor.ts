import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { BQUEUE, JOBS } from '../constant';
import { ActivityService } from '../activity/activity.service';

@Processor(BQUEUE.ACTIVITY_BULK)
export class ActivityBulkProcessor {
  private readonly logger = new Logger(ActivityBulkProcessor.name);
  constructor(private readonly activityService: ActivityService) {}

  @Process(JOBS.ACTIVITIES.PROCESS_BULK_CHUNK)
  async processBulkChunk(job: Job) {
    this.logger.log(`Processing bulk activity chunk ${job.data.tempActivityId}`);
    await this.activityService.processBulkChunk(job.data.tempActivityId);
  }
}
