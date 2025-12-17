import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from 'src/constant';
import { StatsService } from 'src/stats/stat.service';

@Injectable()
export class StatsProcessor implements OnApplicationBootstrap {
  constructor(private readonly statsService: StatsService) {}

  async onApplicationBootstrap() {
    this.statsService.calculateAllStats();
  }

  @OnEvent(EVENTS.PHASE_ACTIVATED)
  async onPhaseTriggered(eventObject) {
    return;
    // return this.statsService.savePhaseActivatedStats(eventObject.phaseId);
  }

  @OnEvent(EVENTS.PHASE_REVERTED)
  async onPhaseReverted(eventObject) {
    return;
    // return this.statsService.savePhaseRevertStats(eventObject.phaseId);
  }

  @OnEvent(EVENTS.ACTIVITY_COMPLETED)
  @OnEvent(EVENTS.ACTIVITY_DELETED)
  @OnEvent(EVENTS.ACTIVITY_ADDED)
  @OnEvent(EVENTS.PHASE_REVERTED)
  @OnEvent(EVENTS.PHASE_ACTIVATED)
  async onActivityCompleted() {
    // return this.statsService.calculatePhaseActivities();
    return this.statsService.calculateAllStats();
  }
}
