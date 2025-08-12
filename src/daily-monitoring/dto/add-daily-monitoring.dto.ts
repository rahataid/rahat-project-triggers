import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class AddDailyMonitoringDto {
  @IsString()
  riverBasin: string;

  @IsArray()
  data: any[];

  user: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  uuid?: string;
}
