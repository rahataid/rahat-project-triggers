import { Module } from '@nestjs/common';
import { DailyMonitoringService } from './daily-monitoring.service';
import { DailyMonitoringController } from './daily-monitoring.controller';

@Module({
  controllers: [DailyMonitoringController],
  providers: [DailyMonitoringService],
})
export class DailyMonitoringModule {}
