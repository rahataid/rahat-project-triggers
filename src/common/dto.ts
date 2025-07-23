import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsJSON,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    example: 1,
    description: 'page number',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'number of items per page',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  perPage?: number = 100;

  @ApiProperty({
    example: 'createdAt',
    description: 'Sort field',
    required: false,
  })
  @IsOptional()
  @IsString()
  sort: string;

  @ApiProperty({
    example: 'desc',
    description: 'Sort order',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
export class AddTriggerJobDto {
  @IsString()
  id: string;

  @IsString()
  trigger_type: string;

  @IsString()
  phase: string;

  @IsString()
  title: string;

  @IsString()
  description?: string;

  @IsString()
  source: string;

  @IsString()
  river_basin: string;

  @IsJSON()
  params: JSON;

  @IsBoolean()
  is_mandatory: boolean;

  @IsString()
  notes: string;
}

export class UpdateTriggerParamsJobDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsBoolean()
  @IsOptional()
  isTriggered?: boolean;

  @IsObject()
  @IsOptional()
  params?: Record<string, any>;
}
