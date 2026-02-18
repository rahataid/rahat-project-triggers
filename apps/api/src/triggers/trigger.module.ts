import { Module } from '@nestjs/common';
import { TriggersController } from './triggers.controller';
import { TriggersService } from './trigger.service';

@Module({
  imports: [],
  controllers: [TriggersController],
  providers: [TriggersService],
})
export class TriggersModule {}
