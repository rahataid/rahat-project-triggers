import { Controller, Logger, UseGuards } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
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
import { MicroserviceAuthGuard } from 'src/guards/microservice-auth.guard';
import { RequireAbility } from 'src/decorators/require-ability.decorator';

@Controller('trigger')
@UseGuards(MicroserviceAuthGuard)
export class TriggerController {
  private readonly logger = new Logger(TriggerController.name);

  constructor(private readonly triggerService: TriggerService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ADD,
  })
  @RequireAbility({ action: 'read', subject: 'Phases' })
  async create(payload: CreateTriggerPayloadDto) {
    return this.triggerService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_ALL,
  })
  @RequireAbility({ action: 'read', subject: 'Phases' })
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
  activateTrigger(payload: ActivateTriggerPayloadDto) {
    return this.triggerService.activateTrigger(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE,
  })
  updateTrigger(payload: UpdateTriggerPayloadDto) {
    return this.triggerService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE_TRANSCTION,
  })
  updateTriggerTransaction(payload: UpdateTriggerTransactionDto) {
    return this.triggerService.updateTransaction(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.REMOVE,
  })
  remove(payload: RemoveTriggerPayloadDto) {
    return this.triggerService.remove(payload);
  }
}
