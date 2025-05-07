import { forwardRef, Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';
import { PhasesModule } from 'src/phases/phases.module';
import { PrismaModule } from '@rumsan/prisma';
import { HttpModule } from '@nestjs/axios';
import { SourcesDataModule } from 'src/sources-data/sources-data.module';

@Module({
  imports: [
    PrismaModule,
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
