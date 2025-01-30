import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@rumsan/prisma';
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

@Module({
  imports: [
    EventEmitterModule.forRoot({ maxListeners: 10, ignoreErrors: false }),
    ConfigModule.forRoot({ isGlobal: true }),
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
    PrismaModule,
    ProcessorsModule,
    RumsanAppModule,
    CategoryModule,
    PhasesModule,
    TriggerModule,
    ActivityModule,
    SourcesDataModule,
    DailyMonitoringModule,
    ScheduleModule.forRoot(),
    ListenersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
