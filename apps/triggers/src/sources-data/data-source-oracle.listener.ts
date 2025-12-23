import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as core from '@lib/core';
import { DataSource, Prisma } from '@lib/database';
import { TriggerStatement } from 'src/trigger/validation/trigger.schema';
import { TriggerService } from 'src/trigger/trigger.service';

type TriggerType = Prisma.TriggerGetPayload<{
  include: {
    phase: true;
  };
}>;

@Injectable()
export class DataSourceEventsOracleListener {
  private readonly logger = new Logger(DataSourceEventsOracleListener.name);

  constructor(private readonly triggerService: TriggerService) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.WATER_LEVEL)
  async handleDhmWaterLevel(event: core.DataSourceEventPayload) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.RAINFALL)
  async handleDhmRainfall(event: core.DataSourceEventPayload) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL)
  async handleGlofasWaterLevel(event: core.DataSourceEventPayload) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.GFH.WATER_LEVEL)
  async handleGfsWaterLevel(event: core.DataSourceEventPayload) {}
}
