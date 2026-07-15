import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

enum LogicOperator {
  AND = 'AND',
  OR = 'OR',
}

@ValidatorConstraint({ name: 'isTriggerReference', async: false })
class IsTriggerReferenceConstraint implements ValidatorConstraintInterface {
  validate(triggers: unknown): boolean {
    if (!Array.isArray(triggers)) return false;
    return triggers.every(
      (entry) =>
        (typeof entry === 'string' && entry.length > 0) ||
        (typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as { triggerLogicKey?: unknown }).triggerLogicKey ===
            'string' &&
          (entry as { triggerLogicKey: string }).triggerLogicKey.length > 0),
    );
  }

  defaultMessage(): string {
    return 'each value in triggers must be a non-empty logicKey string or an object with a non-empty triggerLogicKey string';
  }
}

class TriggerGroupDto {
  @ApiProperty({
    description: 'Operator applied within this group',
    enum: LogicOperator,
    example: 'AND',
  })
  @IsEnum(LogicOperator)
  operator: LogicOperator;

  @ApiProperty({
    description:
      'logicKey references to triggers belonging to this group — either a bare logicKey string or a { triggerLogicKey } object',
    example: ['dhm_water_level', 'dhm_rainfall'],
  })
  @IsArray()
  @Validate(IsTriggerReferenceConstraint)
  triggers: Array<string | { triggerLogicKey: string }>;
}

export class SetExtendedTriggerLogicDto {
  @ApiProperty({
    description: 'Phase UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  uuid: string;

  @ApiProperty({
    description: 'Groups of triggers, each evaluated with its own operator',
    type: [TriggerGroupDto],
    example: [
      { operator: 'AND', triggers: ['dhm_water_level', 'dhm_rainfall'] },
      { operator: 'AND', triggers: ['glofas_flood_prob', 'gfh_discharge'] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerGroupDto)
  groups: TriggerGroupDto[];

  @ApiProperty({
    description: 'Operator used to combine group results',
    enum: LogicOperator,
    example: 'OR',
  })
  @IsEnum(LogicOperator)
  joinOperator: LogicOperator;
}
