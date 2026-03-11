import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class ActivateTriggerDto {
  @ApiProperty({
    description: 'Trigger UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  uuid: string;

  @ApiProperty({
    description: 'Application ID',
    example: 'app-123',
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
