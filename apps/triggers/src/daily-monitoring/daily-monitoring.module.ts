import { Module } from '@nestjs/common';
import { DailyMonitoringService } from './daily-monitoring.service';
import { DailyMonitoringController } from './daily-monitoring.controller';
import { PrismaModule } from '@lib/database';

@Module({
  imports: [PrismaModule],
  controllers: [DailyMonitoringController],
  providers: [DailyMonitoringService],
})
export class DailyMonitoringModule {}
