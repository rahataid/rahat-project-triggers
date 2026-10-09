import { ApiProperty } from '@nestjs/swagger';
import { TriggerCallbackType } from '@lib/database';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateTriggerCallbackDto {
  @ApiProperty({
    description: 'UUID of the trigger this callback belongs to',
  })
  @IsString()
  @IsNotEmpty()
  triggerId: string;

  @ApiProperty({
    enum: TriggerCallbackType,
    description: 'The kind of side effect to run when the trigger fires',
  })
  @IsEnum(TriggerCallbackType)
  type: TriggerCallbackType;

  @ApiProperty({
    required: false,
    description: 'Optional label for the callback',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description:
      'Type-specific configuration. Shape depends on `type` (see callback-config.schema.ts)',
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({
    required: false,
    description:
      'Opaque reference to an entity in another service (e.g. Activity uuid for ACTIVITY_COMMUNICATION callbacks)',
  })
  @IsOptional()
  @IsString()
  xref?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateTriggerCallbackPayloadDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  appId: string;

  @ApiProperty({ type: CreateTriggerCallbackDto })
  @IsObject()
  callback: CreateTriggerCallbackDto;
}

export class CreateTriggerCallbacksDto {
  @ApiProperty({
    type: [CreateTriggerCallbackDto],
    description: 'Callbacks to create, one or more at a time',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerCallbackDto)
  triggerCallbackConfig: CreateTriggerCallbackDto[];
}

export class UpdateTriggerCallbacksByXrefDto {
  @ApiProperty({
    description:
      'Opaque reference (e.g. Activity uuid) whose existing callbacks are replaced',
  })
  @IsString()
  @IsNotEmpty()
  xrefId: string;

  @ApiProperty({
    type: [CreateTriggerCallbackDto],
    required: false,
    description:
      'Replacement set of callbacks for this xref — existing callbacks with this xref are deleted and these are created in their place. An empty array clears all callbacks for this xref.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerCallbackDto)
  triggerCallbackConfig: CreateTriggerCallbackDto[];
}

export class UpdateTriggerCallbacksByTriggerDto {
  @ApiProperty({
    description: 'UUID of the trigger whose existing callbacks are replaced',
  })
  @IsString()
  @IsNotEmpty()
  triggerId: string;

  @ApiProperty({
    type: [CreateTriggerCallbackDto],
    required: false,
    description:
      'Replacement set of callbacks for this trigger — existing callbacks on this trigger are deleted and these are created in their place. An empty array clears all callbacks for this trigger.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerCallbackDto)
  triggerCallbackConfig: CreateTriggerCallbackDto[];
}
