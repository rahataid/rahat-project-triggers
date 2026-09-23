import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { CommunicationService } from './communication.service';
import {
  CreateCommunicationDto,
  GetCommunicationDto,
  UpdateCommunicationDto,
} from './dto';

@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.COMMUNICATIONS.CREATE,
  })
  async create(@Payload() payload: CreateCommunicationDto) {
    return this.communicationService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.COMMUNICATIONS.GET_ALL,
  })
  async getAll(@Payload() payload: GetCommunicationDto) {
    return this.communicationService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.COMMUNICATIONS.GET_ONE,
  })
  async getOne(@Payload() payload: { uuid: string }) {
    return this.communicationService.findOne(payload.uuid);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.COMMUNICATIONS.UPDATE,
  })
  async update(@Payload() payload: UpdateCommunicationDto & { uuid: string }) {
    const { uuid, ...rest } = payload;
    return this.communicationService.update(uuid, rest);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.COMMUNICATIONS.REMOVE,
  })
  async remove(@Payload() payload: { uuid: string }) {
    return this.communicationService.remove(payload.uuid);
  }
}
