import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { BQUEUE, MS_TRIGGER_CLIENTS } from 'src/constant';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TriggerModule } from 'src/trigger/trigger.module';
import { PhasesStatsService } from './phases.stats.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
  providers: [PhasesService, PhasesStatsService],
  exports: [PhasesService, PhasesStatsService],
})
export class PhasesModule {}
