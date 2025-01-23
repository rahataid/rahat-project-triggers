import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@rumsan/prisma';
import { PhasesModule } from './phases/phases.module';
import { SourcesModule } from './sources/sources.module';
import { MonitorModule } from './monitor/monitor.module';
import { TriggerModule } from './trigger/trigger.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    PrismaModule,
    RumsanAppModule,
    CategoryModule,
    PhasesModule,
    SourcesModule,
    MonitorModule,
    TriggerModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
