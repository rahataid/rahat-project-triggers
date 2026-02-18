import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@lib/database';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export enum SourceDataType {
  Point = 'POINT',
  Hourly = 'HOURLY',
  Daily = 'DAILY',
}

export enum GlofasProbFloodReturnPeriod {
  TwoYears = '2 years',
  FiveYears = '5 years',
  TwentyYears = '20 years',
}

export class GetSouceDataDto extends PartialType(PaginationDto) {
  @ApiProperty({
    type: String,
  })
  @IsString()
  riverBasin: string;

  @ApiProperty({
    example: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsOptional()
  @IsString()
  source?: DataSource;

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

export class GetAllGlofasProbFloodDto {
  @ApiProperty({
    type: String,
    example: 'Doda River',
    description: 'River basin name',
  })
  @IsString()
  riverBasin: string;
}

export class GetOneGlofasProbFloodDto extends GetAllGlofasProbFloodDto {
  @ApiProperty({
    type: String,
    example: GlofasProbFloodReturnPeriod.TwoYears,
    description: 'Return period',
    enum: GlofasProbFloodReturnPeriod,
  })
  @IsString()
  @IsEnum(GlofasProbFloodReturnPeriod)
  returnPeriod: GlofasProbFloodReturnPeriod;
}
