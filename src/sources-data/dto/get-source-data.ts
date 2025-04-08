import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@prisma/client';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export enum SourceDataType {
  Point = 'POINT',
  Hourly = 'HOURLY',
  Daily = 'DAILY',
}

export class GetSouceDataDto extends PartialType(PaginationDto) {
  @ApiProperty({
    type: String,
  })
  @IsString()
  riverBasin: string;

  @ApiProperty({
    type: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsString()
  source: DataSource;

  @ApiProperty({
    example: SourceDataType.Point,
  })
  @IsEnum(SourceDataType)
  @IsString()
  type: SourceDataType;

  @ApiProperty({
    example: '2023-10-01T00:00:00.000Z',
  })
  @IsDate()
  @IsOptional()
  from: Date;

  @ApiProperty({
    example: '2023-10-01T00:00:00.000Z',
  })
  @IsDate()
  @IsOptional()
  to: Date;

  @ApiProperty({
    example: '2242424',
  })
  @IsString()
  appId: string;
}
