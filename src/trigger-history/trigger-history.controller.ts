import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TriggerHistoryService } from './trigger-history.service';
import { MS_TRIGGERS_JOBS } from '../constant';
import { GetTriggerHistoryDto } from './dto/get-trigger-history.dto';

@Controller()
export class TriggerHistoryController {
  constructor(private readonly triggerHistoryService: TriggerHistoryService) {}

  @MessagePattern({ cmd: MS_TRIGGERS_JOBS.REVERT_PHASE.CREATE })
  async create(@Payload() payload: { phaseUuid: string, user: any }) {
    return this.triggerHistoryService.create(payload);
  }

  @MessagePattern({ cmd: MS_TRIGGERS_JOBS.REVERT_PHASE.GET_ALL })
  async findAll(@Payload() payload: GetTriggerHistoryDto) {
    return this.triggerHistoryService.findAll(payload);
  }
} 