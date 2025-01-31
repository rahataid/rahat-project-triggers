import { forwardRef, Module } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { PhasesController } from './phases.controller';
import { PrismaModule } from '@rumsan/prisma';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';
// import { BeneficiaryModule } from 'src/beneficiary/beneficiary.module';
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
    // BeneficiaryModule,
    forwardRef(() => TriggerModule),
  ],
  controllers: [PhasesController],
  providers: [PhasesService, PhasesStatsService],
  exports: [PhasesService, PhasesStatsService],
})
export class PhasesModule {}
