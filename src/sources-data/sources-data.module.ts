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
import { HealthCacheService } from 'src/source/health-cache.service';
import { HealthUtilsService } from './utils/health-utils.service';
import { DhmStationProcessorService } from './utils/dhm-station-processor.service';
import Redis from 'ioredis';

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
    HealthCacheService,
    HealthUtilsService,
    DhmStationProcessorService,
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
