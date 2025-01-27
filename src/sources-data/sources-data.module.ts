import { Module } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { SourcesDataController } from './sources-data.controller';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@rumsan/prisma';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [SourcesDataController],
  providers: [SourcesDataService, ScheduleSourcesDataService],
  exports: [SourcesDataService, ScheduleSourcesDataService],
})
export class SourcesDataModule {}
