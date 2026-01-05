import { Module } from '@nestjs/common';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';
import { PrismaModule } from '@lib/database';

@Module({
  imports: [PrismaModule],
  controllers: [TriggerHistoryController],
  providers: [TriggerHistoryService],
  exports: [TriggerHistoryService],
})
export class TriggerHistoryModule {}
