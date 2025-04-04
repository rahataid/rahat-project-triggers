import { Controller } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateActivityDto, GetActivityDto, UpdateActivityDto } from './dto';
import { ActivityStatus } from '@prisma/client';
import { MS_TRIGGERS_JOBS } from 'src/constant';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  // create(@AppId() appId: string, @Body() dto: CreateActivityDto) {
  //   return this.activityService.create(appId, dto);
  // }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  // findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
  //   return this.activityService.findAll(appId, dto);
  // }

  // @Get(':uuid')
  // findOne(@Param('uuid') uuid: string) {
  //   return this.activityService.findOne(uuid);
  // }
  // @Patch(':uuid')
  // update(@Param('uuid') uuid: string, @Body() dto: UpdateActivityDto) {
  //   return this.activityService.update(uuid, dto);
  // }

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
  async getHavingComms(@Payload() payload: GetActivityDto): Promise<any> {
    return this.activityService.getHavingComms(payload);
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

  // @MessagePattern({
  //   cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.TRIGGER,
  //   uuid: process.env.PROJECT_ID,
  // })
  // async triggerCommunication(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   console.log('object');
  //   return this.activityService.triggerCommunication(payload);
  // }

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
  async getCommsStats() {
    return this.activityService.getCommsStats();
  }
}
