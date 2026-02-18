import { Prisma, PrismaService } from '@lib/database';
import { Injectable, Logger } from '@nestjs/common';
import { TriggerDto } from './dto/trigger.dto';
import { Parser } from 'expr-eval';

@Injectable()
export class TriggersService {
  private readonly logger = new Logger(TriggersService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    this.logger.log('Finding all triggers');
    return this.prismaService.trigger.findMany();
  }

  async findOne(id: number) {
    this.logger.log(`Finding trigger with id: ${id}`);
    return this.prismaService.trigger.findUnique({
      where: { id },
    });
  }

  async create(data: TriggerDto) {
    // Payload example
    /*
    {
    "repeatKey": "asfadf",
    "repeatEvery": "1",
    "triggerStatement": {
        "phase": "Readness",
        "value": 5,
        "source": "water_level_m",
        "operator": ">=",
        "expression": "warning_level >= 5",
        "riverBasin": "Doda",
        "sourceSubType": "warning_level"
    },
    "triggerDocuments": null,
    "notes": "asdfasdfasf",
    "title": "Titile",
    "description": "this is atest",
    "phaseId": null,
    "source": null,
    "isMandatory": false,
    "isTriggered": false,
    "isDeleted": false,
    "isDailyMonitored": false,
    "createdBy": null,
    "triggeredBy": null,
    "transactionHash": null,
    "triggeredAt": null,
    }
    */
    this.logger.log('Creating trigger', data);
    const triggerStatement = JSON.parse(data.triggerStatement) as {
      expression: string;
      source: string;
      operator: string;
      value: number;
      sourceSubType: string;
    };
    console.log('Trigger statement', triggerStatement);

    const result = Parser.evaluate(triggerStatement.expression, {
      [triggerStatement.sourceSubType]: 90,
    });

    console.log('Result', result);

    return this.prismaService.trigger.create({
      data: {
        ...data,
        triggerStatement: triggerStatement,
      },
    });
  }

  async update(id: number, data: Prisma.TriggerUpdateInput) {
    this.logger.log(`Updating trigger with id: ${id}`, data);
    return this.prismaService.trigger.update({ where: { id }, data });
  }

  async delete(id: number) {
    this.logger.log(`Deleting trigger with id: ${id}`);
    return this.prismaService.trigger.delete({ where: { id } });
  }
}
