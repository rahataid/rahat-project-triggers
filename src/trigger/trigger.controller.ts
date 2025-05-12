import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { GetTriggersDto, UpdateTriggerTransactionDto } from './dto';
import { TriggerService } from './trigger.service';

@Controller('trigger')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ADD,
  })
  async create(payload: any) {
    // here we are checking if the payload is an array  for bulk create
    // also we are  checking if the payload  is an object as it is may be use for single create in others modules
    // we are using  here at once because we have to use the same method for different  moddules that is job schedule
    const { appId, ...rest } = payload;
    if (Array.isArray(payload?.triggers)) {
      return await this.triggerService.bulkCreate(appId, payload.triggers);
    }
    return await this.triggerService.create(appId, rest);
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
  getOne(payload: any) {
    return this.triggerService.getOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.GET_BY_LOCATION,
  })
  getByLocation(payload): Promise<any> {
    return this.triggerService.findByLocation(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.ACTIVATE,
  })
  activateTrigger(payload) {
    const { uuid, appId, ...dto } = payload;
    return this.triggerService.activateTrigger(uuid, appId, dto);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE,
  })
  updateTrigger(payload) {
    const { uuid, appId, ...dto } = payload;
    return this.triggerService.update(uuid, appId, dto);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.UPDATE_TRANSCTION,
  })
  updateTriggerTransaction(payload: UpdateTriggerTransactionDto) {
    return this.triggerService.updateTransaction(
      payload.uuid,
      payload.transactionHash,
    );
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TRIGGER.REMOVE,
  })
  remove(payload) {
    const { repeatKey } = payload;
    return this.triggerService.remove(repeatKey);
  }
}
