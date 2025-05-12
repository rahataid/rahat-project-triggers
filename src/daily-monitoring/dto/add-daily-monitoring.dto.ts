import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class MonitoringDataDto {
  [key: string]: any;
}

export class AddDailyMonitoringDto {
  @IsString()
  riverBasin: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MonitoringDataDto)
  data: MonitoringDataDto[];

  user: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  uuid?: string;
}
