import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@rumsan/prisma';
import { BQUEUE, MS_TRIGGER_CLIENTS } from 'src/constant';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TriggerModule } from 'src/trigger/trigger.module';
import { PhasesStatsService } from './phases.stats.service';

@Module({
  imports: [
    PrismaModule,
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
    ClientsModule.register([
      {
        name: MS_TRIGGER_CLIENTS.RAHAT,
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD,
        },
      },
    ]),
  ],
  controllers: [PhasesController],
  providers: [PhasesService, PhasesStatsService],
  exports: [PhasesService, PhasesStatsService],
})
export class PhasesModule {}
