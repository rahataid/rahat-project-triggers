import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [],
  controllers: [LibraryController],
  exports: [LibraryService],
  providers: [LibraryService],
})
export class LibraryModule {}
