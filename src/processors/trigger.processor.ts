import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
// import { BQUEUE, DATA_SOURCES, JOBS } from '../constants';
import { Job } from 'bull';
// import { PhasesService } from '../phases/phases.service';
import { BQUEUE, JOBS } from 'src/constant';
import { PhasesService } from 'src/phases/phases.service';

@Processor(BQUEUE.TRIGGER)
export class TriggerProcessor {
  private readonly logger = new Logger(TriggerProcessor.name);

  constructor(private readonly phaseService: PhasesService) {}

  @Process(JOBS.TRIGGER.REACHED_THRESHOLD)
  async processTrigger(job: Job) {
    const payload = job.data;

    this.logger.log(
      `Processing trigger job for repeatKey: ${payload.repeatKey}`,
    );
    if (payload.source) {
      this.processAutomatedData(payload);
    }
  }

  async processAutomatedData(payload) {
    const phaseData = await this.phaseService.getOne(payload.phaseId);
    this.logger.log(
      `Processing automated data for phase ${phaseData.uuid}: ${phaseData.name}`,
    );

    const conditionsMet = await this.checkTriggerConditions(
      phaseData.triggerRequirements,
    );
    this.logger.log(
      `Conditions met to activate phase ${phaseData.uuid}: ${conditionsMet}`,
    );
    if (conditionsMet) {
      this.phaseService.activatePhase(phaseData.uuid);
    }
    return;
  }

  async processManualTrigger(payload) {
    const phaseData = await this.phaseService.getOne(payload.phaseId);

    const conditionsMet = this.checkTriggerConditions(
      phaseData.triggerRequirements,
    );
    if (conditionsMet) {
      this.phaseService.activatePhase(phaseData.uuid);
    }
    return;
  }

  checkTriggerConditions(triggerRequirements) {
    const { mandatoryTriggers, optionalTriggers } = triggerRequirements;

    // if not triggers are set return false
    if (
      !mandatoryTriggers.requiredTriggers &&
      !optionalTriggers.requiredTriggers
    )
      return false;

    const mandatoryMet =
      mandatoryTriggers.receivedTriggers >= mandatoryTriggers.requiredTriggers;
    const optionalMet =
      optionalTriggers.receivedTriggers >= optionalTriggers.requiredTriggers;

    return mandatoryMet && optionalMet;
  }
}
