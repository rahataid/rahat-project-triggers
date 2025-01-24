import { Module } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { SourcesDataController } from './sources-data.controller';

@Module({
  controllers: [SourcesDataController],
  providers: [SourcesDataService],
})
export class SourcesDataModule {}
