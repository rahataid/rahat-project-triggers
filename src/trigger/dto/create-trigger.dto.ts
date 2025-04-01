import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateTriggerDto {
  @ApiProperty({
    example: 'unique-key',
    description: 'A unique key to identify the trigger',
  })
  @IsString()
  @IsOptional()
  uuid?: string;

  @ApiProperty({
    example: 'unique-repeat-key',
    description: 'A unique key to identify the trigger',
  })
  @IsString()
  @IsOptional()
  repeatKey?: string;

  @ApiProperty({
    example: 'Trigger Title',
    description: 'The title of the trigger',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Every day',
    description: 'The repeat frequency of the trigger',
  })
  @IsString()
  @IsOptional()
  repeatEvery?: string;

  @ApiProperty({
    example: { condition: 'value' },
    description: 'The statement that defines the trigger conditions',
  })
  @IsOptional()
  triggerStatement?: Record<string, any>;

  @ApiProperty({
    example: { documentKey: 'documentValue' },
    description: 'Documents associated with the trigger',
  })
  @IsOptional()
  triggerDocuments?: Record<string, any>;

  @ApiProperty({
    example: 'Some notes about the trigger',
    description: 'Additional notes for the trigger',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the related phase',
  })
  @IsString()
  @IsOptional()
  phaseId?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the trigger is mandatory',
  })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates if the trigger has been executed',
  })
  @IsBoolean()
  @IsOptional()
  isTriggered?: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates if the trigger is deleted',
  })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who triggered the action',
  })
  @IsString()
  @IsOptional()
  triggeredBy?: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'The date and time when the trigger was executed',
  })
  @Type(() => Date)
  @IsOptional()
  triggeredAt?: Date;

  @ApiProperty({
    example: DataSource.MANUAL,
    description:
      'This should only be passed when need to create a manual trigger',
  })
  @IsOptional()
  @IsEnum(DataSource)
  dataSource?: DataSource;

  @ApiProperty({
    example: 'Amazon Basin',
    description: 'The location for the trigger statement',
    required: false,
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;
}

export class BulkCreateTriggerDto {
  @ApiProperty({
    type: [CreateTriggerDto],
    description: 'An array of triggers to be created',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerDto)
  triggers: CreateTriggerDto[];
}
