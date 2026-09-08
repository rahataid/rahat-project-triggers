import { Controller, Logger, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  MicroserviceAuthGuard,
  RequireAbility,
} from '@rumsan/user/ability/ms-rpc-auth';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { ACTIONS, SUBJECTS } from 'src/common/ability.constants';
import {
  CreateTriggerCallbackDto,
  GetTriggerCallbackDto,
  GetTriggerCallbackLogsDto,
  GetTriggerCallbacksDto,
  RemoveTriggerCallbackDto,
  ReplayTriggerCallbackDto,
  UpdateTriggerCallbackDto,
} from './dto';
import { TriggerCallbackService } from './trigger-callback.service';

@Controller('trigger-callback')
@UseGuards(MicroserviceAuthGuard)
export class TriggerCallbackController {
  private readonly logger = new Logger(TriggerCallbackController.name);

  constructor(
    private readonly triggerCallbackService: TriggerCallbackService,
  ) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.ADD,
  })
  @RequireAbility(ACTIONS.CREATE, SUBJECTS.TRIGGER)
  create(payload: CreateTriggerCallbackDto) {
    return this.triggerCallbackService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.GET_ALL,
  })
  findAll(payload: GetTriggerCallbacksDto) {
    return this.triggerCallbackService.findAllForTrigger(payload.triggerId);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.GET_ONE,
  })
  findOne(payload: GetTriggerCallbackDto) {
    return this.triggerCallbackService.findOne(payload.uuid);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.UPDATE,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.TRIGGER)
  update(payload: UpdateTriggerCallbackDto) {
    return this.triggerCallbackService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.REMOVE,
  })
  @RequireAbility(ACTIONS.DELETE, SUBJECTS.TRIGGER)
  remove(payload: RemoveTriggerCallbackDto) {
    return this.triggerCallbackService.remove(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.GET_LOGS,
  })
  getLogs(payload: GetTriggerCallbackLogsDto) {
    return this.triggerCallbackService.getLogs(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.CALLBACKS.REPLAY,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.TRIGGER)
  replay(payload: ReplayTriggerCallbackDto) {
    return this.triggerCallbackService.replay(payload.callbackUuid);
  }
}
