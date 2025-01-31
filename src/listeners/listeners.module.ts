import { Module } from '@nestjs/common';
import { ListernersService } from './listeners.service';
import { BullModule } from '@nestjs/bull';
import { BQUEUE } from 'src/constant';
// import { StatsService } from 'src/stats/stats.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: BQUEUE.SCHEDULE,
    }),
  ],
  providers: [ListernersService],
})
export class ListenersModule {}
