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
  responsibility?: string;

  @IsOptional()
  @IsEnum(['NOT_STARTED', 'WORK_IN_PROGRESS', 'COMPLETED', 'DELAYED'])
  status?: 'NOT_STARTED' | 'WORK_IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
}
