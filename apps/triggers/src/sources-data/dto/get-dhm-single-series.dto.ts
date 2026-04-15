import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SourceDataType } from './get-source-data';

export class GetDhmSingleSeriesDto {
  @ApiProperty({
    example: '2023-10-01T00:00:00.000Z',
    description: 'Start date',
  })
  @IsDate()
  from: Date;

  @ApiProperty({
    example: '2023-10-01T00:00:00.000Z',
    description: 'End date',
  })
  @IsDate()
  to: Date;

  @ApiProperty({
    enum: SourceDataType,
    example: SourceDataType.Daily,
  })
  @IsEnum(SourceDataType)
  period: SourceDataType;

  @ApiProperty({
    example: 1234,
    description: 'DHM station series ID',
  })
  @IsNumber()
  seriesId: number;

  @ApiProperty({
    type: String,
    example: 'Doda',
    description: 'River basin name',
  })
  @IsString()
  riverBasin: string;
}

export class GetDhmSingleSeriesTemperatureDto {
  @ApiProperty({
    example: 1234,
    description: 'DHM station series ID',
  })
  @IsNumber()
  seriesId: number;

  @ApiProperty({
    type: String,
    example: 'Doda',
    description: 'River basin name',
  })
  @IsString()
  riverBasin: string;

  @ApiProperty({
    example: 'TN_1D',
  })
  @IsString()
  @IsOptional()
  parameter?: string;
}
