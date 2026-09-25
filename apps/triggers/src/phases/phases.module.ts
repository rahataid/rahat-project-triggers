import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { BQUEUE, MS_TRIGGER_CLIENTS } from 'src/constant';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TriggerModule } from 'src/trigger/trigger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SseModule } from 'src/sse/sse.module';
import { TriggerCallbackModule } from 'src/trigger-callback/trigger-callback.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BQUEUE.TRIGGER,
    }),
    BullModule.registerQueue({
      name: BQUEUE.CONTRACT,
    }),
    BullModule.registerQueue({
      name: BQUEUE.COMMUNICATION,
    }),
    forwardRef(() => TriggerModule),
    TriggerCallbackModule,
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
  ],
  controllers: [PhasesController],
  providers: [PhasesService, SseModule],
  exports: [PhasesService],
})
export class PhasesModule {}
