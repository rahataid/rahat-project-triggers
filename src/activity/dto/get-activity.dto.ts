import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetActivityDto {
  @IsOptional()
  @IsString()
  appId?: string;
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  perPage?: number;

  @IsOptional()
  @IsString()
  managerId: string;

  @IsOptional()
  @IsString()
  responsibility?: string;

  @IsOptional()
  @IsEnum(['NOT_STARTED', 'WORK_IN_PROGRESS', 'COMPLETED', 'DELAYED'])
  status?: 'NOT_STARTED' | 'WORK_IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

  @ApiProperty({
    example: 'karnali',
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;

  @ApiProperty({
    example: '2025',
  })
  @IsString()
  @IsOptional()
  activeYear?: string;

  @IsBoolean()
  @IsOptional()
  isAutomated?: boolean;
}
