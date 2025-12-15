import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class ActivateTriggerPayloadDto {
  @ApiProperty({
    description: 'Trigger UUID',
    required: false,
  })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiProperty({
    description: 'Trigger repeat key',
    required: false,
  })
  @IsOptional()
  @IsString()
  repeatKey?: string;

  @ApiProperty({
    description: 'Application ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiProperty({
    description: 'Trigger documents',
    required: false,
  })
  @IsOptional()
  @IsArray()
  triggerDocuments?: unknown[];

  @ApiProperty({
    description: 'User information',
    required: false,
  })
  @IsOptional()
  user?: { name?: string };

  @ApiProperty({
    description: 'Notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

