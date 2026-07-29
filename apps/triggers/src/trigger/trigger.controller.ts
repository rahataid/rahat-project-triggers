import { Controller, Logger, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { MicroserviceAuthGuard } from 'src/auth/microservice-auth.guard';
import { RequireAbility } from 'src/auth/require-ability.decorator';
import { ACTIONS, SUBJECTS } from 'src/common/ability.constants';
import {
  GetTriggersDto,
  UpdateTriggerTransactionDto,
  CreateTriggerPayloadDto,
  ActivateTriggerPayloadDto,
  UpdateTriggerPayloadDto,
  GetByLocationPayloadDto,
  RemoveTriggerPayloadDto,
  findOneTriggerDto,
} from './dto';
import { TriggerService } from './trigger.service';

@Controller('trigger')
@UseGuards(MicroserviceAuthGuard)
export class TriggerController {
  private readonly logger = new Logger(TriggerController.name);

  constructor(private readonly triggerService: TriggerService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ADD,
  })
  @RequireAbility({ action: ACTIONS.CREATE, subject: SUBJECTS.TRIGGER })
  async create(payload: CreateTriggerPayloadDto) {
    return this.triggerService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_ALL,
  })
  findAll(payload: GetTriggersDto): any {
    return this.triggerService.getAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_ONE,
  })
  getOne(payload: findOneTriggerDto) {
    return this.triggerService.findOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_BY_LOCATION,
  })
  getByLocation(payload: GetByLocationPayloadDto): Promise<any> {
    return this.triggerService.findByLocation(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ACTIVATE,
  })
  @RequireAbility({ action: ACTIONS.ACTIVATE, subject: SUBJECTS.TRIGGER })
  activateTrigger(payload: ActivateTriggerPayloadDto) {
    return this.triggerService.activateTrigger(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE,
  })
  @RequireAbility({ action: ACTIONS.UPDATE, subject: SUBJECTS.TRIGGER })
  updateTrigger(payload: UpdateTriggerPayloadDto) {
    return this.triggerService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE_TRANSCTION,
  })
  @RequireAbility({ action: ACTIONS.UPDATE, subject: SUBJECTS.TRIGGER })
  updateTriggerTransaction(payload: UpdateTriggerTransactionDto) {
    return this.triggerService.updateTransaction(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.REMOVE,
  })
  @RequireAbility({ action: ACTIONS.DELETE, subject: SUBJECTS.TRIGGER })
  remove(payload: RemoveTriggerPayloadDto) {
    return this.triggerService.remove(payload);
  }
}
