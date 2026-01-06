import { ApiProperty } from '@nestjs/swagger';
import { DataSource, SourceType } from '@lib/database';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSeriesDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsOptional()
  type?: SourceType;

  @ApiProperty({
    example: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsString()
  dataSource: DataSource;

  @ApiProperty({
    example: 'karnali',
  })
  @IsString()
  riverBasin: string;

  @ApiProperty({
    example: 'karnali',
  })
  @IsOptional()
  @IsString()
  stationName?: string;
}
