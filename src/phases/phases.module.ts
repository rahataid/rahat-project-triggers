import { Module } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { PhasesController } from './phases.controller';

@Module({
  controllers: [PhasesController],
  providers: [PhasesService],
})
export class PhasesModule {}
