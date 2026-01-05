import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as core from '@lib/core';
import { DataSource, PrismaService, SourceType } from '@lib/database';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BQUEUE, JOBS } from 'src/constant';

@Injectable()
export class DataSourceEventsOracleListener {
  private readonly logger = new Logger(DataSourceEventsOracleListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BQUEUE.BLOCKCHAIN_TRANSFER)
    private readonly blockchainQueue: Queue,
  ) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.WATER_LEVEL)
  async handleDhmWaterLevel(event: core.DataSourceEventPayload) {
    const indicators: core.Indicator[] = event.indicators;
    const sourcesToUpdate: Array<{
      sourceId: number | string;
      value: number | string;
    }> = [];

    for (const indicator of indicators) {
      const seriesId =
        indicator.location.type === 'BASIN'
          ? indicator.location.seriesId?.toString()
          : undefined;

      if (!seriesId) {
        this.logger.error('No seriesId found for indicator');
        continue;
      }

      const sourcesData = await this.prisma.sourcesData.findFirst({
        where: {
          dataSource: DataSource.DHM,
          type: SourceType.WATER_LEVEL,
          stationRef: seriesId,
        },
        select: {
          onChainRef: true,
        },
      });

      if (sourcesData?.onChainRef) {
        this.logger.log(
          `Found sourcesData for seriesId: ${seriesId}, will update on-chain with value: ${indicator.value}`,
        );
        sourcesToUpdate.push({
          sourceId: sourcesData.onChainRef,
          value: indicator.value,
        });
      } else {
        this.logger.error(`No blockchain ID found for seriesId: ${seriesId}`);
      }
    }

    if (sourcesToUpdate.length > 0) {
      this.blockchainQueue.add(
        JOBS.BLOCKCHAIN.UPDATE_SOURCE_VALUE_BATCH,
        { sources: sourcesToUpdate },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(
        `Queued ${sourcesToUpdate.length} source updates for batch processing`,
      );
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.RAINFALL)
  async handleDhmRainfall(event: core.DataSourceEventPayload) {
    console.log('DHM RAIN FALL EVENT RECEIVED');
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL)
  async handleGlofasWaterLevel(event: core.DataSourceEventPayload) {
    console.log(event);
    console.log('GLOFAS WATER LEVEL EVENT RECEIVED');
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GFH.WATER_LEVEL)
  async handleGfsWaterLevel(event: core.DataSourceEventPayload) {
    console.log('GFH WATER LEVEL EVENT RECEIVED');
  }
}
