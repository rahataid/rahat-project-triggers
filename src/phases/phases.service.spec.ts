import { Test, TestingModule } from '@nestjs/testing';
import { PhasesService } from './phases.service';

describe('PhasesService', () => {
  let service: PhasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhasesService],
    }).compile();

    service = module.get<PhasesService>(PhasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
