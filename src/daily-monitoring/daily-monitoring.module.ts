import { Module } from '@nestjs/common';
import { PrismaModule } from '@rumsan/prisma';
import { DailyMonitoringService } from './daily-monitoring.service';
import { DailyMonitoringController } from './daily-monitoring.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DailyMonitoringController],
  providers: [DailyMonitoringService],
})
export class DailyMonitoringModule {}
