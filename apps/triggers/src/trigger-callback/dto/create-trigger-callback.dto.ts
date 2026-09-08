import { ApiProperty } from '@nestjs/swagger';
import { TriggerCallbackType } from '@lib/database';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
