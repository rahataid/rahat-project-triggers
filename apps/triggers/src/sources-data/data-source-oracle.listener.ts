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

      this.logger.log(
        `Found sourcesData for seriesId: ${seriesId}, updating on-chain with value: ${indicator.value}`,
      );

      if (sourcesData?.onChainRef) {
        this.blockchainQueue.add(
          JOBS.BLOCKCHAIN.UPDATE_SOURCE_VALUE,
          { sourceId: sourcesData.onChainRef, value: indicator.value },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } else {
        this.logger.error(`No blockchain ID found for seriesId: ${seriesId}`);
      }
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.RAINFALL)
  async handleDhmRainfall(event: core.DataSourceEventPayload) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL)
  async handleGlofasWaterLevel(event: core.DataSourceEventPayload) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.GFH.WATER_LEVEL)
  async handleGfsWaterLevel(event: core.DataSourceEventPayload) {}
}
