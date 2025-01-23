import { PartialType } from '@nestjs/swagger';
import { CreateDailyMonitoringDto } from './create-daily-monitoring.dto';

export class UpdateDailyMonitoringDto extends PartialType(
  CreateDailyMonitoringDto,
) {}
