import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateDailyMonitoringDto } from './create-daily-monitoring.dto';
import { IsOptional, IsString } from 'class-validator';
import { AddDailyMonitoringDto } from './add-daily-monitoring.dto';

export class UpdateDailyMonitoringDto extends PartialType(
  AddDailyMonitoringDto,
) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  uuid: string;

  user?: any;
}
