import { Body, Controller, Logger } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { PhasesService } from './phases.service';
import { ConfigureThresholdPhaseDto, GetPhaseByName } from './dto';
import { ConfigService } from '@nestjs/config';

@Controller('phases')
export class PhasesController {
  logger = new Logger(PhasesController.name);
  constructor(
    private readonly phasesService: PhasesService,
    private readonly configService: ConfigService,
  ) {}

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

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.ACTIVATE,
  })
  async activatePhase(@Body() dto: { phaseUuid: string }) {
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    if (isDevelopment) {
      this.logger.log(`Activating phase with UUID: ${dto.phaseUuid}`);
      return await this.phasesService.activatePhase(dto.phaseUuid);
    }

    throw new RpcException('Not allowed in production environment');
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CONFIGURE_THRESHOLD,
  })
  async configurePhaseThreshold(payload: ConfigureThresholdPhaseDto) {
    return this.phasesService.configurePhaseThreshold(payload);
  }
}
