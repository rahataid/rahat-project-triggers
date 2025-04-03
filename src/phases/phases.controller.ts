import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { PhasesService } from './phases.service';
import { GetPhaseByName } from './dto';

@Controller('phases')
export class PhasesController {
  logger = new Logger(PhasesController.name);
  constructor(private readonly phasesService: PhasesService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CREATE,
  })
  async create(payload) {
    return this.phasesService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ALL,
  })
  async getAll(payload: any): Promise<any> {
    return this.phasesService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ONE,
  })
  async getOne(payload: GetPhaseByName) {
    this.logger.log(`Getting phase with: ${JSON.stringify(payload)}`);
    return this.phasesService.getOneByDetail(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.ADD_TRIGGERS,
  })
  async addTriggers(payload) {
    return this.phasesService.addTriggersToPhases(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.REVERT_PHASE,
  })
  async revertPhase(payload) {
    const { appId, ...rest } = payload;
    return this.phasesService.revertPhase(appId, rest);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_BY_LOCATION,
  })
  async getByLocation(payload) {
    return this.phasesService.findByLocation(payload.appId, payload.location);
  }
}
