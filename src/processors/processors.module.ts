import { Module } from '@nestjs/common';
import { PrismaService } from '@rumsan/prisma';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { PhasesModule } from '../phases/phases.module';
// import { CommunicationProcessor } from './communication.processor';
// import { ContractProcessor } from './contract.processor';
import { ScheduleProcessor } from './schedule.processor';
import { TriggerProcessor } from './trigger.processor';
import { StatsProcessor } from './stats.processor';
import { CommunicationProcessor } from './communication.processor';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsModule } from 'src/stats/stat.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CORE_MODULE } from 'src/constant';
import { NotificationProcessor } from './notification.processor';
// import { StatsProcessor } from './stats.processor';
// import { TriggerProcessor } from './trigger.processor';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: CORE_MODULE,
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD,
        },
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
    PrismaService,
    // ContractProcessor,
    CommunicationProcessor,
    StatsProcessor,
    NotificationProcessor,
  ],
})
export class ProcessorsModule {}
