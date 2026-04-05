import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { BQUEUE, JOBS } from 'src/constant';
import { PhasesService } from 'src/phases/phases.service';
import { PrismaService } from '@lib/database';
import { evaluatePhase } from 'src/phases/phase-evaluation.engine';
import type {
  ExtendedTriggerLogic,
  TriggersMap,
} from 'src/phases/phase-evaluation.types';

@Processor(BQUEUE.TRIGGER)
export class TriggerProcessor {
  private readonly logger = new Logger(TriggerProcessor.name);

  constructor(
    private readonly phaseService: PhasesService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JOBS.TRIGGER.REACHED_THRESHOLD)
  async processTrigger(job: Job) {
    const payload = job.data;

    this.logger.log(`Processing trigger job for uuid: ${payload.uuid}`);
    if (payload.source) {
      this.processAutomatedData(payload);
    }
  }

  async processAutomatedData(payload) {
    const phaseData = await this.phaseService.findOne(payload.phaseId);
    this.logger.log(
      `Processing automated data for phase ${phaseData.uuid}: ${phaseData.name}`,
    );

    const extendedLogic =
      phaseData.extendedTriggerLogic as unknown as ExtendedTriggerLogic | null;

    // If no extended logic configured, use legacy counter-based evaluation
    if (!extendedLogic) {
      const conditionsMet = this.checkTriggerConditions(
        phaseData.triggerRequirements,
      );
      this.logger.log(
        `Legacy conditions met to activate phase ${phaseData.uuid}: ${conditionsMet}`,
      );
      if (conditionsMet) {
        this.phaseService.activatePhase(phaseData.uuid);
      }
      return;
    }

    // Extended logic path: build triggers map and run evaluation engine
    const triggers = await this.prisma.trigger.findMany({
      where: { phaseId: phaseData.uuid, isDeleted: false },
    });

    const triggersMap: TriggersMap = {};
    const mandatoryTriggerKeys: string[] = [];

    for (const trigger of triggers) {
      if (!trigger.logicKey) continue;
      triggersMap[trigger.logicKey] = {
        isTriggered: trigger.isTriggered,
        triggeredAt: trigger.triggeredAt,
      };
      if (trigger.isMandatory) {
        mandatoryTriggerKeys.push(trigger.logicKey);
      }
    }

    const result = evaluatePhase({
      phaseId: phaseData.uuid,
      mandatoryTriggerKeys,
      extendedTriggerLogic: extendedLogic,
      triggersMap,
    });

    this.logger.log(
      `Extended evaluation result for phase ${phaseData.uuid}: ${JSON.stringify(result)}`,
    );

    if (result.finalResult) {
      this.phaseService.activatePhase(phaseData.uuid);
    }
  }

  /** Legacy counter-based threshold check (backward compatible) */
  checkTriggerConditions(triggerRequirements) {
    const { mandatoryTriggers, optionalTriggers } = triggerRequirements;

    // if no triggers are set return false
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
