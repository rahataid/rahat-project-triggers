import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetByLocationPayloadDto {
  @ApiProperty({
    description: 'River basin name',
    required: false,
  })
  @IsOptional()
  @IsString()
  riverBasin?: string;

  @ApiProperty({
    description: 'Page number',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  perPage?: number;
}

