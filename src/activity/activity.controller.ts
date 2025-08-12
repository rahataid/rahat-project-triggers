import { Controller } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateActivityDto,
  GetActivityDto,
  GetActivityHavingCommsDto,
  UpdateActivityDto,
} from './dto';
import { ActivityStatus } from '@prisma/client';
import { MS_TRIGGERS_JOBS } from 'src/constant';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.ADD,
  })
  async add(@Payload() payload: CreateActivityDto) {
    return this.activityService.add(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_ALL,
  })
  async getAll(@Payload() payload: GetActivityDto): Promise<any> {
    return this.activityService.getAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.LIST_PROJECT_SPECIFIC,
  })
  async listProjectSpecific(@Payload() payload: GetActivityDto): Promise<any> {
    return this.activityService.listProjectSpecific(payload);
  }
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_HAVING_COMMS,
  })
  async getHavingComms(
    @Payload() payload: GetActivityHavingCommsDto,
  ): Promise<any> {
    return this.activityService.getHavingComms(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_COMMS,
  })
  async getComms(
    @Payload() payload: GetActivityHavingCommsDto,
  ): Promise<any> {
    return this.activityService.getComms(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_ONE,
  })
  async getOne(@Payload() payload: { uuid: string; appId: string }) {
    return await this.activityService.getOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.REMOVE,
  })
  async remove(@Payload() payload: { uuid: string }) {
    return this.activityService.remove(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.TRIGGER,
  })
  async triggerCommunication(payload: {
    communicationId: string;
    activityId: string;
    appId: string;
  }) {
    return this.activityService.triggerCommunication(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.SESSION_LOGS,
  })
  async communicationLogs(
    @Payload()
    payload: {
      communicationId: string;
      activityId: string;
      appId: string;
    },
  ) {
    return this.activityService.getSessionLogs(payload);
  }

  // @MessagePattern({
  //   cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.RETRY_FAILED,
  //   uuid: process.env.PROJECT_ID,
  // })
  // async retryFailedBroadcast(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   return this.activityService.retryFailedBroadcast(payload);
  // }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.UPDATE_STATUS,
  })
  async updateStatus(
    @Payload()
    payload: {
      uuid: string;
      status: ActivityStatus;
      notes: string;
      activityDocuments: Record<string, string>;
      user: any;
    },
  ) {
    return this.activityService.updateStatus(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.UPDATE,
  })
  async update(@Payload() payload: UpdateActivityDto) {
    return this.activityService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.GET_STATS,
  })
  async getCommsStats(payload: { appId: string }) {
    return await this.activityService.getCommsStats(payload.appId);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.GET_STATS_GROUP,
  })
  async getTransportSessionStatsByGroup(payload: { appId: string }) {
    return this.activityService.getTransportSessionStatsByGroup(payload.appId);
  }
}
