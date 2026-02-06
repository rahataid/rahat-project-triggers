import { forwardRef, Module } from '@nestjs/common';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { PhasesModule } from '../phases/phases.module';
import { TriggerProcessor } from './trigger.processor';
import { StatsProcessor } from './stats.processor';
import { CommunicationProcessor } from './communication.processor';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsModule } from 'src/stats/stat.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CORE_MODULE } from 'src/constant';
import { NotificationProcessor } from './notification.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainProcessor } from './updateSourceOnchain.processor';
import { AddTriggerOnchainProcessor } from './addTriggerOnchain.processor';
import { ActiveTriggerOnchainProcessor } from './activeTriggerOnchain.processor';
import { TriggerModule } from '../trigger/trigger.module';

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
    forwardRef(() => TriggerModule),
  ],
  providers: [
    TriggerProcessor,
    CommunicationProcessor,
    StatsProcessor,
    NotificationProcessor,
    BlockchainProcessor,
    AddTriggerOnchainProcessor,
    ActiveTriggerOnchainProcessor,
  ],
})
export class ProcessorsModule {}
