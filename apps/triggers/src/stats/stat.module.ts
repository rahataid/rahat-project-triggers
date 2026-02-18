import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsService } from './stat.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [ActivityModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
