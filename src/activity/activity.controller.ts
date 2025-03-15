import { Controller } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MessagePattern } from '@nestjs/microservices';
import { CreateActivityDto, GetActivityDto, UpdateActivityDto } from './dto';
import { ActivityStatus } from '@prisma/client';
import { MS_TRIGGERS_JOBS } from 'src/constant';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) { }

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
    uuid: process.env.PROJECT_ID,
  })
  async add(payload: CreateActivityDto) {
    return this.activityService.add(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_ALL,
    uuid: process.env.PROJECT_ID,
  })
  async getAll(payload: GetActivityDto): Promise<any> {
    return this.activityService.getAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_HAVING_COMMS,
    uuid: process.env.PROJECT_ID,
  })
  async getHavingComms(payload: GetActivityDto): Promise<any> {
    return this.activityService.getHavingComms(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.GET_ONE,
    uuid: process.env.PROJECT_ID,
  })
  async getOne(payload: { uuid: string }) {
    return await this.activityService.getOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.REMOVE,
    uuid: process.env.PROJECT_ID,
  })
  async remove(payload: any) {
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
  //   return this.activityService.triggerCommunication(payload);
  // }

  // @MessagePattern({
  //   cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.SESSION_LOGS,
  //   uuid: process.env.PROJECT_ID,
  // })
  // async communicationLogs(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   return this.activityService.getSessionLogs(payload);
  // }

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
    uuid: process.env.PROJECT_ID,
  })
  async updateStatus(payload: {
    uuid: string;
    status: ActivityStatus;
    notes: string;
    activityDocuments: Record<string, string>;
    user: any;
  }) {
    return this.activityService.updateStatus(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.UPDATE,
    uuid: process.env.PROJECT_ID,
  })
  async update(payload: UpdateActivityDto) {
    return this.activityService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.ACTIVITIES.COMMUNICATION.GET_STATS,
    uuid: process.env.PROJECT_ID,
  })
  async getCommsStats() {
    return this.activityService.getCommsStats();
  }
}
