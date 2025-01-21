import { Test, TestingModule } from '@nestjs/testing';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

describe('PhasesController', () => {
  let controller: PhasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
      providers: [PhasesService],
    }).compile();

    controller = module.get<PhasesController>(PhasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
