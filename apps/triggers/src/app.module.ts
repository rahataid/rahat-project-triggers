import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@lib/database';
import { PhasesModule } from './phases/phases.module';
import { TriggerModule } from './trigger/trigger.module';
import { ActivityModule } from './activity/activity.module';
import { SourcesDataModule } from './sources-data/sources-data.module';
import { DailyMonitoringModule } from './daily-monitoring/daily-monitoring.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProcessorsModule } from './processors/processors.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ListenersModule } from './listeners/listeners.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MS_TRIGGER_CLIENTS } from './constant';
import { CommsModule } from './comms/comms.module';
import { SourceModule } from './source/source.module';
import { TriggerHistoryModule } from './trigger-history/trigger-history.module';
import { StatsModule } from './stats/stat.module';
import { HttpModule } from '@nestjs/axios';
import { SettingsModule } from '@lib/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({}),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: MS_TRIGGER_CLIENTS.RAHAT,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
            password: configService.get('REDIS_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    PrismaModule.forRootWithConfig({
      isGlobal: true,
    }),
    HttpModule.register({
      global: true,
    }),
    SettingsModule,
    ProcessorsModule,
    CategoryModule,
    PhasesModule,
    TriggerModule,
    ActivityModule,
    SourcesDataModule,
    DailyMonitoringModule,
    ScheduleModule.forRoot(),
    ListenersModule,
    CommsModule.forRoot(),
    SourceModule,
    TriggerHistoryModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
