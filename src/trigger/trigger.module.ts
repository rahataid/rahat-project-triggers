import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';

@Module({
  controllers: [TriggerController],
  providers: [TriggerService],
})
export class TriggerModule {}
