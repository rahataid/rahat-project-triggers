import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as core from '@lib/core';
import { DataSource, Prisma, PrismaService, SourceType } from '@lib/database';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BQUEUE, JOBS } from 'src/constant';
import { TriggerService } from 'src/trigger/trigger.service';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { TriggerStatement } from 'src/trigger/validation/trigger.schema';
import { AddOnchainTriggerService } from 'src/trigger/onchainTrigger.service';

type TriggerType = Prisma.TriggerGetPayload<{
  include: {
    phase: true;
  };
}>;

@Injectable()
export class DataSourceEventsOracleListener {
  private readonly logger = new Logger(DataSourceEventsOracleListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BQUEUE.BLOCKCHAIN_TRANSFER)
    private readonly blockchainQueue: Queue,
    private readonly triggerService: TriggerService,
    private readonly triggerEvaluationService: TriggerEvaluationService,
    private readonly addOnchainTriggerService: AddOnchainTriggerService,
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

    if (indicators.length === 0) {
      return;
    }

    const indicator = indicators[0].indicator;

    const triggers = await this.triggerService.findTriggersBySourceAndIndicator(
      DataSource.DHM,
      indicator,
    );

    if (!triggers.length) {
      this.logger.log(
        `No triggers found for DHM Water Level event for indicator ${indicator}`,
      );
      return;
    }

    const triggerMap: Record<string, TriggerType[]> = triggers.reduce(
      (acc, trigger) => {
        const statement = trigger.triggerStatement as TriggerStatement;
        const stationId = statement.stationId;
        if (!stationId) {
          this.logger.warn(
            `Station ID not found for trigger ${trigger.uuid} for WATER LEVEL TRIGGER`,
          );
          return acc;
        }

        if (!acc[stationId]) {
          acc[stationId] = [];
        }
        acc[stationId].push(trigger);
        return acc;
      },
      {},
    );

    for await (const indicator of indicators) {
      const stationId =
        indicator.location.type === 'BASIN'
          ? indicator.location.seriesId
          : undefined;

      const triggers = triggerMap[stationId];

      if (!triggers) {
        continue;
      }

      const meetsCondition =
        this.triggerEvaluationService.checkTriggersMeetCondition(
          triggers,
          +indicator.value,
        );

      if (meetsCondition) {
        this.logger.log('Trigger condition met for DHM water level');

        await this.addOnchainTriggerService.updateTriggerOnChain({
          uuid: triggers[0].uuid,
        });

        return;
      }
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.RAINFALL)
  async handleDhmRainfall(event: core.DataSourceEventPayload) {
    console.log('DHM RAIN FALL EVENT RECEIVED');
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL)
  async handleGlofasWaterLevel(event: core.DataSourceEventPayload) {
    const indicators: core.Indicator[] = event.indicators;
    const sourcesToUpdate: Array<{
      sourceId: number | string;
      value: number | string;
    }> = [];

    for (const indicator of indicators) {
      const i = (indicator.source?.metadata as any)?.i;
      const j = (indicator.source?.metadata as any)?.j;

      if (!i || !j) {
        this.logger.error('No i or j found in indicator metadata');
        continue;
      }

      const stationRef = `${String(i)}-${String(j)}`;

      const sourcesData = await this.prisma.sourcesData.findFirst({
        where: {
          dataSource: DataSource.GLOFAS,
          type: SourceType.WATER_LEVEL,
          stationRef: stationRef,
        },
        select: {
          onChainRef: true,
        },
      });

      if (sourcesData?.onChainRef) {
        this.logger.log(
          `Found sourcesData for stationRef: ${stationRef}, will update on-chain with value: ${indicator.value}`,
        );
        sourcesToUpdate.push({
          sourceId: sourcesData.onChainRef,
          value: indicator.value,
        });
      } else {
        this.logger.error(
          `No blockchain ID found for stationRef: ${stationRef}`,
        );
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
        `Queued ${sourcesToUpdate.length} GLOFAS source updates for batch processing`,
      );
    }

    if (indicators.length === 0) {
      return;
    }

    const indicator = indicators[0].indicator;

    const triggers = await this.triggerService.findTriggersBySourceAndIndicator(
      DataSource.GLOFAS,
      indicator,
    );

    if (!triggers.length) {
      this.logger.log('No triggers found for GLOFAS water level event');
      return;
    }

    const triggerMap = triggers.reduce(
      (acc, trigger) => {
        const statement = trigger.triggerStatement as TriggerStatement;
        const sourceSubType = statement.sourceSubType;
        if (!acc[sourceSubType]) {
          acc[sourceSubType] = [];
        }
        acc[sourceSubType].push(trigger);
        return acc;
      },
      {} as Record<string, TriggerType[]>,
    );

    for await (const indicator of indicators) {
      const [twoYearsMaxProb, fiveYearsMaxProb, twentyYearsMaxProb] =
        indicator.value.toString().split('/');

      const twoYearsMaxProbTriggers = triggerMap['two_years_max_prob'];
      const fiveYearsMaxProbTriggers = triggerMap['five_years_max_prob'];
      const twentyYearsMaxProbTriggers = triggerMap['twenty_years_max_prob'];

      const twoYearsMeets =
        this.triggerEvaluationService.checkTriggersMeetCondition(
          twoYearsMaxProbTriggers,
          Number(twoYearsMaxProb?.trim()) || 0,
        );
      const fiveYearsMeets =
        this.triggerEvaluationService.checkTriggersMeetCondition(
          fiveYearsMaxProbTriggers,
          Number(fiveYearsMaxProb?.trim()) || 0,
        );
      const twentyYearsMeets =
        this.triggerEvaluationService.checkTriggersMeetCondition(
          twentyYearsMaxProbTriggers,
          Number(twentyYearsMaxProb?.trim()) || 0,
        );

      if (twoYearsMeets || fiveYearsMeets || twentyYearsMeets) {
        this.logger.log('Trigger condition met for GLOFAS water level');

        if (twoYearsMeets && twoYearsMaxProbTriggers) {
          await this.triggerEvaluationService.processAndEvaluateTriggers(
            twoYearsMaxProbTriggers,
            Number(twoYearsMaxProb?.trim()) || 0,
          );
          const triggerUuids: string[] = [];
          for (const trigger of twoYearsMaxProbTriggers) {
            const statement = trigger.triggerStatement as TriggerStatement;
            const expression =
              this.triggerEvaluationService.generateExpression(statement);
            const meetsThreshold =
              this.triggerEvaluationService.evaluateConditionExpression(
                {
                  expression,
                  sourceSubType: statement.sourceSubType,
                },
                Number(twoYearsMaxProb?.trim()) || 0,
              );
            if (meetsThreshold) {
              triggerUuids.push(trigger.uuid);
            }
          }
          for (const triggerUuid of triggerUuids) {
            await this.addOnchainTriggerService.updateTriggerOnChain({
              uuid: triggerUuid,
            });
          }
        }

        if (fiveYearsMeets && fiveYearsMaxProbTriggers) {
          await this.triggerEvaluationService.processAndEvaluateTriggers(
            fiveYearsMaxProbTriggers,
            Number(fiveYearsMaxProb?.trim()) || 0,
          );
          const triggerUuids: string[] = [];
          for (const trigger of fiveYearsMaxProbTriggers) {
            const statement = trigger.triggerStatement as TriggerStatement;
            const expression =
              this.triggerEvaluationService.generateExpression(statement);
            const meetsThreshold =
              this.triggerEvaluationService.evaluateConditionExpression(
                {
                  expression,
                  sourceSubType: statement.sourceSubType,
                },
                Number(fiveYearsMaxProb?.trim()) || 0,
              );
            if (meetsThreshold) {
              triggerUuids.push(trigger.uuid);
            }
          }
          for (const triggerUuid of triggerUuids) {
            await this.addOnchainTriggerService.updateTriggerOnChain({
              uuid: triggerUuid,
            });
          }
        }

        if (twentyYearsMeets && twentyYearsMaxProbTriggers) {
          await this.triggerEvaluationService.processAndEvaluateTriggers(
            twentyYearsMaxProbTriggers,
            Number(twentyYearsMaxProb?.trim()) || 0,
          );
          const triggerUuids: string[] = [];
          for (const trigger of twentyYearsMaxProbTriggers) {
            const statement = trigger.triggerStatement as TriggerStatement;
            const expression =
              this.triggerEvaluationService.generateExpression(statement);
            const meetsThreshold =
              this.triggerEvaluationService.evaluateConditionExpression(
                {
                  expression,
                  sourceSubType: statement.sourceSubType,
                },
                Number(twentyYearsMaxProb?.trim()) || 0,
              );
            if (meetsThreshold) {
              triggerUuids.push(trigger.uuid);
            }
          }
          for (const triggerUuid of triggerUuids) {
            await this.addOnchainTriggerService.updateTriggerOnChain({
              uuid: triggerUuid,
            });
          }
        }
        return;
      }
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GFH.WATER_LEVEL)
  async handleGfsWaterLevel(event: core.DataSourceEventPayload) {
    console.log('GFH WATER LEVEL EVENT RECEIVED');
  }
}
