import { Logger } from '@nestjs/common';
import { BQUEUE, JOBS } from '../constant';
import { Job } from 'bull';
import { ActivityService } from '../activity/activity.service';
import { Process, Processor } from '@nestjs/bull';

@Processor(BQUEUE.COMMUNICATION)
export class CommunicationProcessor {
  private readonly logger = new Logger(CommunicationProcessor.name);
  constructor(private readonly activitiesService: ActivityService) {}

  @Process(JOBS.ACTIVITIES.COMMUNICATION.TRIGGER)
  async processCommunicationTrigger(job: Job) {
    this.logger.log(
      `Processing communication Queue for activity ${job.data.activityId}`,
    );
    const payload = job.data;

    await this.activitiesService.triggerCommunication({
      communicationId: payload.communicationId,
      activityId: payload.activityId,
      appId: payload.appId,
    });

    return;
  }
}
