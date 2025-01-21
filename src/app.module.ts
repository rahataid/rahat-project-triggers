import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RumsanAppModule } from '@rumsan/app';

@Module({
  imports: [RumsanAppModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
