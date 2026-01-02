import { Controller, Logger } from '@nestjs/common';
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
import { AddOnchainTriggerService } from './onchainTrigger.service';

@Controller('trigger')
export class TriggerController {
  private readonly logger = new Logger(TriggerController.name);

  constructor(
    private readonly triggerService: TriggerService,
    private readonly addOnchainTriggerService: AddOnchainTriggerService,
  ) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ADD,
  })
  async create(payload: CreateTriggerPayloadDto) {
    const result = await this.triggerService.create(payload);
    await this.addOnchainTriggerService.addTriggersOnChain(result);
    return result;
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
  async activateTrigger(payload: ActivateTriggerPayloadDto) {
    const result = await this.triggerService.activateTrigger(payload);
    await this.addOnchainTriggerService.updateTriggerOnChain(result);
    return result;
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE,
  })
  async updateTrigger(payload: UpdateTriggerPayloadDto) {
    return await this.triggerService.update(payload);
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
