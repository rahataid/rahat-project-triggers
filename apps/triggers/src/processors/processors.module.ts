import { Module } from '@nestjs/common';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { PhasesModule } from '../phases/phases.module';
import { ScheduleProcessor } from './schedule.processor';
import { TriggerProcessor } from './trigger.processor';
import { StatsProcessor } from './stats.processor';
import { CommunicationProcessor } from './communication.processor';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsModule } from 'src/stats/stat.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CORE_MODULE } from 'src/constant';
import { NotificationProcessor } from './notification.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
    ScheduleProcessor,
    TriggerProcessor,
    // ContractProcessor,
    CommunicationProcessor,
    StatsProcessor,
    NotificationProcessor,
  ],
})
export class ProcessorsModule {}
