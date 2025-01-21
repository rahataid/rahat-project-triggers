import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';
import { PrismaModule } from '@rumsan/prisma';

@Module({
  imports: [PrismaModule, RumsanAppModule, CategoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
