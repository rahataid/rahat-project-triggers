import { Body, Controller, Param } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppId } from '@rumsan/app';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { UpdateTriggerDto } from './dto';
import { TriggerService } from './trigger.service';

@Controller('trigger')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  // @ApiHeader({
  //   name: 'appId',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ADD,
    uuid: process.env.PROJECT_ID,
  })
  create(payload: any) {
    const { appId, ...rest } = payload;
    return this.triggerService.create(appId, rest);
  }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_ALL,
    uuid: process.env.PROJECT_ID,
  })
  findAll(dto: any): any {
    const { appId, ...rest } = dto;
    return this.triggerService.getAll(appId, rest);
  }

  // @Get(':repeatKey')
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_ONE,
    uuid: process.env.PROJECT_ID,
  })
  getOne(repeatKey: string) {
    return this.triggerService.getOne(repeatKey);
  }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get(':location')
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_BY_LOCATION,
    uuid: process.env.PROJECT_ID,
  })
  getByLocation(payload) {
    const { appId, location } = payload;
    return this.triggerService.findByLocation(appId, location);
  }
  // @Patch(':uuid/activate')
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ACTIVATE,
    uuid: process.env.PROJECT_ID,
  })
  activateTrigger(payload) {
    const { uuid, ...dto } = payload;
    return this.triggerService.activateTrigger(uuid, dto);
  }

  // @Delete(':repeatKey')
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.REMOVE,
    uuid: process.env.PROJECT_ID,
  })
  remove(payload) {
    const { repeatKey } = payload;
    return this.triggerService.remove(repeatKey);
  }
}
