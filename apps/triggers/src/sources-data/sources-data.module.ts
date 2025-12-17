import { forwardRef, Module } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { SourcesDataController } from './sources-data.controller';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { HttpModule } from '@nestjs/axios';
import { DhmService } from './dhm.service';
import { DhmModule, DhmService as DhmServiceLib } from '@lib/dhm-adapter';
import { GlofasService } from './glofas.service';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';
import Redis from 'ioredis';
import { DataSourceEventsListener } from './data-source-events.listener';
import { HealthMonitoringService, HealthCacheService } from '@lib/core';
import { GlofasModule, GlofasServices } from '@lib/glofas-adapter';
import { TriggerModule } from 'src/trigger/trigger.module';
import { GfhModule, GfhService } from '@lib/gfh-adapter';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: BQUEUE.TRIGGER,
    }),
    DhmModule.forRoot(),
    GlofasModule.forRoot(),
    forwardRef(() => TriggerModule),
    GfhModule.forRoot(),
  ],
  controllers: [SourcesDataController],
  providers: [
    SourcesDataService,
    ScheduleSourcesDataService,
    DhmService,
    GlofasService,
    GfhService,
    ConfigService,
    HealthCacheService,
    DataSourceEventsListener,
    HealthMonitoringService,
    DhmServiceLib,
    GlofasServices,
    GfhService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
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
