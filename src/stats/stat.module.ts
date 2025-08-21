import { Module } from '@nestjs/common';
import { PrismaModule } from '@rumsan/prisma';
import { ActivityModule } from 'src/activity/activity.module';
import { StatsService } from './stat.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [PrismaModule, ActivityModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
