import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class GetActivityHavingCommsDto {
  @IsOptional()
  @IsString()
  appId?: string;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  activeYear?: string;

  @IsOptional()
  @IsString()
  riverBasin?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  perPage?: number;
}
