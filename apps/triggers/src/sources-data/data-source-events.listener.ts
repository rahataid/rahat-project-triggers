import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as core from '@lib/core';
import { DataSource, Prisma } from '@lib/database';
import { TriggerStatement } from 'src/trigger/validation/trigger.schema';
import { Parser } from 'expr-eval';
import { TriggerService } from 'src/trigger/trigger.service';

type TriggerType = Prisma.TriggerGetPayload<{
  include: {
    phase: true;
  };
}>;

@Injectable()
export class DataSourceEventsListener {
  private readonly logger = new Logger(DataSourceEventsListener.name);

  constructor(private readonly triggerService: TriggerService) {}

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.WATER_LEVEL)
  async handleDhmWaterLevel(event: core.DataSourceEventPayload) {
    const indicators: core.Indicator[] = event.indicators;

    this.logger.log(
      `DHM WATER LEVEL EVENT RECEIVED ${indicators.length} indicators`,
    );

    if (indicators.length === 0) {
      this.logger.warn(`indicators not found `);
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

      await this.processAndEvaluateTriggers(triggers, indicator.value);
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.DHM.RAINFALL)
  async handleDhmRainfall(event: core.DataSourceEventPayload) {
    const indicators: core.Indicator[] = event.indicators;
    this.logger.log(
      `DHM RAIN FALL EVENT RECEIVED ${indicators.length} indicators`,
    );

    if (indicators.length === 0) {
      this.logger.warn(`indicators not found `);
      return;
    }

    const indicator = indicators[0].indicator;

    const triggers = await this.triggerService.findTriggersBySourceAndIndicator(
      DataSource.DHM,
      indicator,
    );

    if (!triggers.length) {
      this.logger.log('No triggers found for DHM Rainfall event');
      return;
    }

    const triggerMap: Record<string, TriggerType[]> = triggers.reduce(
      (acc, trigger) => {
        const statement = trigger.triggerStatement as TriggerStatement;
        const stationId = statement.stationId;

        if (!stationId) {
          this.logger.warn(
            `Station ID not found for trigger ${trigger.uuid} for RAINFALL TRIGGER`,
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

      await this.processAndEvaluateTriggers(triggers, indicator.value);
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL)
  async handleGlofasWaterLevel(event: core.DataSourceEventPayload) {
    const indicators = event.indicators;

    this.logger.log(
      `GLOFAS WATER LEVEL EVENT RECEIVED ${indicators.length} indicators`,
    );

    if (indicators.length === 0) {
      this.logger.warn(`indicators not found `);
      return;
    }

    const indicator = indicators[0].indicator;

    const triggers = await this.triggerService.findTriggersBySourceAndIndicator(
      DataSource.GLOFAS,
      indicator,
    );

    if (!triggers.length) {
      this.logger.log('No triggers found for DHM Rainfall event');
      return;
    }

    // we will create hash map with key as sourceSubType and values as triggers
    const triggerMap = triggers.reduce((acc, trigger) => {
      const statement = trigger.triggerStatement as TriggerStatement;
      const sourceSubType = statement.sourceSubType;
      if (!acc[sourceSubType]) {
        acc[sourceSubType] = [];
      }
      acc[sourceSubType].push(trigger);
      return acc;
    }, {});

    for await (const indicator of indicators) {
      const [twoYearsMaxProb, fiveYearsMaxProb, twentyYearsMaxProb] =
        indicator.value.toString().split('/');

      const twoYearsMaxProbTriggers = triggerMap['two_years_max_prob'];
      const fiveYearsMaxProbTriggers = triggerMap['five_years_max_prob'];
      const twentyYearsMaxProbTriggers = triggerMap['twenty_years_max_prob'];

      await this.processAndEvaluateTriggers(
        twoYearsMaxProbTriggers,
        Number(twoYearsMaxProb.trim()) || 0,
      );

      await this.processAndEvaluateTriggers(
        fiveYearsMaxProbTriggers,
        Number(fiveYearsMaxProb.trim()) || 0,
      );

      await this.processAndEvaluateTriggers(
        twentyYearsMaxProbTriggers,
        Number(twentyYearsMaxProb.trim()) || 0,
      );
    }
  }

  @OnEvent(core.DATA_SOURCE_EVENTS.GFH.WATER_LEVEL)
  async handleGfsWaterLevel(event: core.DataSourceEventPayload) {
    const indicators: core.Indicator[] = event.indicators;

    this.logger.log(
      `GFS WATER LEVEL EVENT RECEIVED ${indicators.length} indicators`,
    );

    if (indicators.length === 0) {
      this.logger.warn(`indicators not found `);
      return;
    }
    const triggers = await this.triggerService.findTriggersBySourceAndIndicator(
      DataSource.GFH,
      indicators[0].indicator,
    );

    if (!triggers.length) {
      this.logger.log('No triggers found for DHM Rainfall event');
      return;
    }
    /** The indicators freshly emitted from transform() */

    for (const trigger of triggers) {
      const statement = trigger.triggerStatement as TriggerStatement;
      const expression = statement.expression;

      // 2. Compute MEAN of all indicator values
      const meanValue =
        indicators.reduce((sum, ind) => sum + ind.value, 0) / indicators.length;

      const meetsThreshold = this.evaluateConditionExpression(
        {
          expression,
          sourceSubType: statement.sourceSubType,
        },
        meanValue,
      );

      if (meetsThreshold) {
        this.logger.log(`Trigger ${trigger.id} MET threshold`);
        // update trigger
        // await this.triggerService.activateTrigger(trigger.uuid, '', trigger);
      } else {
        this.logger.log(`Trigger ${trigger.id} NOT met`);
      }
    }
  }

  private generateExpression(triggerStatement: TriggerStatement) {
    return `${triggerStatement.sourceSubType} ${triggerStatement.operator} ${triggerStatement.value}`;
  }

  private evaluateConditionExpression(
    triggerStatement: { expression: string; sourceSubType: string },
    indicatorValue: number,
  ): boolean {
    try {
      const parser = new Parser({
        operators: {
          logical: true,
          comparison: true,
        },
      });

      const variableName = triggerStatement.sourceSubType;

      const expression = parser.parse(triggerStatement.expression);

      const exprResult = expression.evaluate({
        [variableName]: indicatorValue,
      });

      return Boolean(exprResult);
    } catch (error) {
      this.logger.error(
        `Failed to evaluate expression: ${triggerStatement.expression}`,
        error,
      );
      return false;
    }
  }

  private async processAndEvaluateTriggers(
    triggers: TriggerType[] = [],
    value: number,
  ) {
    const triggerUuids = [];

    for (const trigger of triggers) {
      const statement = trigger.triggerStatement as TriggerStatement;
      const expression = this.generateExpression(statement);

      const meetsThreshold = this.evaluateConditionExpression(
        {
          expression,
          sourceSubType: statement.sourceSubType,
        },
        value,
      );

      if (meetsThreshold) {
        this.logger.log(`Trigger ${trigger.uuid} MET threshold`);
        triggerUuids.push(trigger.uuid);
      }
    }

    if (triggerUuids.length > 0) {
      this.logger.log(
        `Activated ${triggerUuids.length} triggers for GLOFAS Subtype ${(triggers[0].triggerStatement as TriggerStatement).sourceSubType}
         with value ${value} and triggers ${triggerUuids.join(', ')}`,
      );
      await this.activateTriggers(triggerUuids);
    }
  }

  private async activateTriggers(triggerUuids: string[]) {
    await this.triggerService.activeAutomatedTriggers(triggerUuids);
  }
}
