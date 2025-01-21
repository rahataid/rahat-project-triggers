import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@rumsan/prisma';
import { PhasesModule } from './phases/phases.module';

@Module({
  imports: [PrismaModule, RumsanAppModule, CategoryModule, PhasesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
