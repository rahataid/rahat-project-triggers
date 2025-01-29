import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// import { PhasesService } from '../phases/phases.service';
import { EVENTS } from 'src/constant';
import { PhasesStatsService } from 'src/phases/phases.stats.service';

@Injectable()
export class StatsProcessor implements OnApplicationBootstrap {
  constructor(private readonly phasesStatsService: PhasesStatsService) {}

  async onApplicationBootstrap() {
    this.phasesStatsService.calculatePhaseActivities();
  }

  @OnEvent(EVENTS.PHASE_ACTIVATED)
  async onPhaseTriggered(eventObject) {
    this.phasesStatsService.savePhaseActivatedStats(eventObject.phaseId);
    return;
  }

  @OnEvent(EVENTS.PHASE_REVERTED)
  async onPhaseReverted(eventObject) {
    this.phasesStatsService.savePhaseRevertStats(eventObject);
    return;
  }

  // this also has phase status in it
  @OnEvent(EVENTS.ACTIVITY_COMPLETED)
  @OnEvent(EVENTS.ACTIVITY_DELETED)
  @OnEvent(EVENTS.ACTIVITY_ADDED)
  @OnEvent(EVENTS.PHASE_REVERTED)
  @OnEvent(EVENTS.PHASE_ACTIVATED)
  async onActivityCompleted() {
    this.phasesStatsService.calculatePhaseActivities();
    return;
  }
}
