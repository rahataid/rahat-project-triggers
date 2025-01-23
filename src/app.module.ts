import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@rumsan/prisma';
import { PhasesModule } from './phases/phases.module';
import { TriggerModule } from './trigger/trigger.module';
import { ActivityModule } from './activity/activity.module';
import { SourcesDataModule } from './sources-data/sources-data.module';
import { DailyMonitoringModule } from './daily-monitoring/daily-monitoring.module';

@Module({
  imports: [
    PrismaModule,
    RumsanAppModule,
    CategoryModule,
    PhasesModule,
    TriggerModule,
    ActivityModule,
    SourcesDataModule,
    DailyMonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
