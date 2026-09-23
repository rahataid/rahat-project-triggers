import { Body, Controller, Logger, UseGuards } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import {
  MicroserviceAuthGuard,
  RequireAbility,
} from '@rumsan/user/ability/ms-rpc-auth';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { ACTIONS, SUBJECTS } from 'src/common/ability.constants';
import { PhasesService } from './phases.service';
import {
  ConfigureThresholdPhaseDto,
  CreatePhaseDto,
  GetPhaseByDetailDto,
  GetPhaseByLocationDto,
  GetPhaseDto,
  RevertPhaseDto,
  SetExtendedTriggerLogicDto,
  UpdatePhaseDto,
} from './dto';
import { ConfigService } from '@nestjs/config';

@Controller('phases')
@UseGuards(MicroserviceAuthGuard)
export class PhasesController {
  logger = new Logger(PhasesController.name);
  constructor(
    private readonly phasesService: PhasesService,
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CREATE,
  })
  @RequireAbility(ACTIONS.CREATE, SUBJECTS.PHASE)
  async create(payload: CreatePhaseDto) {
    return this.phasesService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ALL,
  })
  async getAll(payload: GetPhaseDto) {
    return this.phasesService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ONE,
  })
  async getOne(payload: GetPhaseByDetailDto) {
    return this.phasesService.getOneByDetail(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.ADD_TRIGGERS,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.PHASE)
  async addTriggers(payload) {
    return this.phasesService.addTriggersToPhases(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.REVERT_PHASE,
  })
  @RequireAbility(ACTIONS.REVERT, SUBJECTS.PHASE)
  async revertPhase(payload: RevertPhaseDto) {
    return this.phasesService.revertPhase(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_BY_LOCATION,
  })
  async getByLocation(payload: GetPhaseByLocationDto) {
    return this.phasesService.findByLocation(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.ACTIVATE,
  })
  @RequireAbility(ACTIONS.ACTIVATE, SUBJECTS.PHASE)
  async activatePhase(@Body() dto: { phaseUuid: string }) {
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    if (isDevelopment) {
      this.logger.log(`Activating phase with UUID: ${dto.phaseUuid}`);
      return await this.phasesService.activatePhase(dto.phaseUuid);
    }

    throw new RpcException({
      message: 'Not allowed in production environment',
      code: 'NOT_ALLOWED_PRODUCTION',
    });
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CONFIGURE_THRESHOLD,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.PHASE)
  async configurePhaseThreshold(payload: ConfigureThresholdPhaseDto) {
    return this.phasesService.configurePhaseThreshold(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.UPDATE,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.PHASE)
  async update(payload: UpdatePhaseDto) {
    return this.phasesService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.DELETE,
  })
  @RequireAbility(ACTIONS.DELETE, SUBJECTS.PHASE)
  async delete(payload: { uuid: string }) {
    return this.phasesService.delete(payload.uuid);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_PHASE_PAYOUT_STATUS,
  })
  async IsPayoutPhaseActivated(payload: GetPhaseByLocationDto) {
    return this.phasesService.getPayoutPhaseStatusByMethod(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CONFIGURE_EXTENDED_LOGIC,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.PHASE)
  async setExtendedTriggerLogic(payload: SetExtendedTriggerLogicDto) {
    return this.phasesService.setExtendedTriggerLogic(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_EXTENDED_LOGIC,
  })
  async getExtendedTriggerLogic(payload: { uuid: string }) {
    return this.phasesService.getExtendedTriggerLogic(payload.uuid);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.REMOVE_EXTENDED_LOGIC,
  })
  @RequireAbility(ACTIONS.UPDATE, SUBJECTS.PHASE)
  async removeExtendedTriggerLogic(payload: { uuid: string }) {
    return this.phasesService.removeExtendedTriggerLogic(payload.uuid);
  }
}
