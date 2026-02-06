import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@lib/database';
import { TriggerStatement } from 'src/trigger/validation/trigger.schema';
import { Parser } from 'expr-eval';
import { TriggerService } from 'src/trigger/trigger.service';

type TriggerType = Prisma.TriggerGetPayload<{
  include: {
    phase: true;
  };
}>;

@Injectable()
export class TriggerEvaluationService {
  private readonly logger = new Logger(TriggerEvaluationService.name);

  constructor(private readonly triggerService: TriggerService) {}

  generateExpression(triggerStatement: TriggerStatement): string {
    return `${triggerStatement.sourceSubType} ${triggerStatement.operator} ${triggerStatement.value}`;
  }

  evaluateConditionExpression(
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

  async processAndEvaluateTriggers(
    triggers: TriggerType[] = [],
    value: number,
  ): Promise<void> {
    const triggerUuids: string[] = [];

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
      const sourceSubType =
        triggers[0]?.triggerStatement &&
        (triggers[0].triggerStatement as TriggerStatement).sourceSubType
          ? (triggers[0].triggerStatement as TriggerStatement).sourceSubType
          : 'unknown';

      this.logger.log(
        `Activated ${triggerUuids.length} triggers for Subtype ${sourceSubType} with value ${value} and triggers ${triggerUuids.join(', ')}`,
      );
      await this.activateTriggers(triggerUuids);
    }
  }

  checkTriggersMeetCondition(
    triggers: TriggerType[] = [],
    value: number,
  ): boolean {
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
        return true;
      }
    }

    return false;
  }

  private async activateTriggers(triggerUuids: string[]): Promise<void> {
    await this.triggerService.activeAutomatedTriggers(triggerUuids);
  }
}
