import { Module } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  controllers: [SourcesController],
  providers: [SourcesService],
})
export class SourcesModule {}
