import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum LogicOperator {
  AND = 'AND',
  OR = 'OR',
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
    description: 'logicKey references to triggers belonging to this group',
    example: ['dhm_water_level', 'dhm_rainfall'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  triggers: string[];
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
