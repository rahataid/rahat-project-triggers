import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateDailyMonitoringDto } from './create-daily-monitoring.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDailyMonitoringDto extends PartialType(
  CreateDailyMonitoringDto,
) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  uuid: string;
}
