import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: BQUEUE.SCHEDULE,
      },
      {
        name: BQUEUE.TRIGGER,
      },
    ),
  ],
  controllers: [TriggerController],
  providers: [TriggerService],
})
export class TriggerModule {}
