import { forwardRef, Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';
import { BullModule } from '@nestjs/bull';
import { BQUEUE, CORE_MODULE, SSE_EVENTS } from 'src/constant';
import { PhasesModule } from 'src/phases/phases.module';
import { HttpModule } from '@nestjs/axios';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
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
    HttpModule,
    BullModule.registerQueue(
      {
        name: BQUEUE.TRIGGER,
      },
      {
        name: BQUEUE.STELLAR,
      },
    ),
    forwardRef(() => SourcesDataModule),
    forwardRef(() => PhasesModule),
  ],
  controllers: [TriggerController],
  providers: [
    TriggerService,
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
  exports: [TriggerService],
})
export class TriggerModule {}
