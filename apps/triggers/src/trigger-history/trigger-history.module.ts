import { Module } from '@nestjs/common';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';
import { SSE_EVENTS } from 'src/constant';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [TriggerHistoryController],
  providers: [
    TriggerHistoryService,
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
  exports: [TriggerHistoryService],
})
export class TriggerHistoryModule {}
