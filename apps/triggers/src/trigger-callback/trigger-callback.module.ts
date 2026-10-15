import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BQUEUE, CORE_MODULE } from 'src/constant';
import { TriggerCallbackController } from './trigger-callback.controller';
import { TriggerCallbackService } from './trigger-callback.service';
import { TriggerCallbackDispatcher } from './trigger-callback.dispatcher';

@Module({
  imports: [
    HttpModule,
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
    BullModule.registerQueue(
      {
        name: BQUEUE.TRIGGER_CALLBACK,
      },
      {
        name: BQUEUE.COMMUNICATION,
      },
    ),
  ],
  controllers: [TriggerCallbackController],
  providers: [TriggerCallbackService, TriggerCallbackDispatcher],
  exports: [TriggerCallbackService, TriggerCallbackDispatcher],
})
export class TriggerCallbackModule {}
