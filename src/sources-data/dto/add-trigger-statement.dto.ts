import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DataSource } from '@prisma/client';

class ActivityDto {
  @ApiProperty({
    example: 'uuid-activity',
    description: 'The UUID of the activity',
  })
  @IsString()
  uuid: string;
}

class TriggerDocsDto {
  @ApiProperty({
    example: 'uuid-trigger-doc',
    description: 'The UUID of the trigger document',
  })
  @IsString()
  uuid: string;
}

export class AddTriggerStatementDto {
  @ApiProperty({
    example: 'uuid-trigger',
    description: 'The unique identifier of the trigger',
    required: false,
  })
  @IsString()
  @IsOptional()
  uuid?: string;

  @ApiProperty({
    example: 'Amazon Basin',
    description: 'The location for the trigger statement',
    required: false,
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;

  @ApiProperty({
    example: 'GLOFAS',
    description: 'The data source associated with the trigger',
    enum: DataSource,
  })
  @IsEnum(DataSource)
  dataSource: DataSource;

  @ApiProperty({
    example: '5 minutes',
    description: 'The repetition interval for the trigger',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  repeatEvery?: number | string;

  @ApiProperty({
    type: [ActivityDto],
    description: 'The list of related activities',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  @IsOptional()
  activities?: ActivityDto[];

  @ApiProperty({
    example: { condition: 'rainfall > 100mm' },
    description: 'The JSON trigger statement',
  })
  @IsObject()
  triggerStatement: Record<string, any>;

  @ApiProperty({
    example: 'uuid-phase',
    description: 'The phase ID linked to the trigger',
  })
  @IsString()
  phaseId: string;

  @ApiProperty({
    example: 'Flood Warning',
    description: 'The title of the trigger',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    type: [TriggerDocsDto],
    description: 'The list of trigger documents',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerDocsDto)
  @IsOptional()
  triggerDocuments?: TriggerDocsDto[];

  @ApiProperty({
    example: 'This is a mandatory trigger.',
    description: 'Additional notes for the trigger',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the trigger is mandatory',
  })
  @IsBoolean()
  isMandatory: boolean;
}
