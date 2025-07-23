import { Module } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { SourcesDataController } from './sources-data.controller';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@rumsan/prisma';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';
import { GfhService } from './gfh.service';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    BullModule.registerQueue({
      name: BQUEUE.TRIGGER,
    }),
  ],
  controllers: [SourcesDataController],
  providers: [
    SourcesDataService,
    ScheduleSourcesDataService,
    DhmService,
    GlofasService,
    GfhService,
    ConfigService,
  ],
  exports: [
    SourcesDataService,
    ScheduleSourcesDataService,
    DhmService,
    GfhService,
    GlofasService,
  ],
})
export class SourcesDataModule {}
