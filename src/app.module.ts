import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [RumsanAppModule, CategoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
