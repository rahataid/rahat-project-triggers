import { Module } from '@nestjs/common';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { PhasesModule } from '../phases/phases.module';
import { TriggerProcessor } from './trigger.processor';
import { StatsProcessor } from './stats.processor';
import { CommunicationProcessor } from './communication.processor';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsModule } from 'src/stats/stat.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CORE_MODULE, SSE_EVENTS } from 'src/constant';
import { NotificationProcessor } from './notification.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CORE_MODULE,
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
    PhasesModule,
    SourcesDataModule,
    ActivityModule,
    StatsModule,
  ],
  providers: [
    TriggerProcessor,
    CommunicationProcessor,
    StatsProcessor,
    NotificationProcessor,
    {
      provide: SSE_EVENTS.PUBLISHER,
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get('REDIS_HOST'),
          port: Number(config.get('REDIS_PORT')),
          password: config.get('REDIS_PASSWORD'),
        }),
      inject: [ConfigService],
    },
  ],
})
export class ProcessorsModule {}
