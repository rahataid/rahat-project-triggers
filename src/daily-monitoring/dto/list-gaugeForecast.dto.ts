import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GaugeForecastDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  station?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gaugeForecast?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  date?: string;
}
