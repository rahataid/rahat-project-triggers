import { Module } from '@nestjs/common';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';

@Module({
  controllers: [TriggerHistoryController],
  providers: [TriggerHistoryService],
  exports: [TriggerHistoryService],
})
export class TriggerHistoryModule {}
