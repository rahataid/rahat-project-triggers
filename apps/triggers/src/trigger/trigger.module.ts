import { forwardRef, Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';
import { BullModule } from '@nestjs/bull';
import { BQUEUE, CORE_MODULE } from 'src/constant';
import { PhasesModule } from 'src/phases/phases.module';
import { HttpModule } from '@nestjs/axios';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
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
    HttpModule,
    SourcesDataModule,
    BullModule.registerQueue(
      {
        name: BQUEUE.SCHEDULE,
      },
      {
        name: BQUEUE.TRIGGER,
      },
      {
        name: BQUEUE.STELLAR,
      },
    ),
    forwardRef(() => PhasesModule),
  ],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
