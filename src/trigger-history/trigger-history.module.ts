import { Module } from '@nestjs/common';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';
import { PrismaService } from '@rumsan/prisma';

@Module({
  controllers: [TriggerHistoryController],
  providers: [TriggerHistoryService, PrismaService],
  exports: [TriggerHistoryService],
})
export class TriggerHistoryModule {} 