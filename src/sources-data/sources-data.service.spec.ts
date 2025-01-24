import { Test, TestingModule } from '@nestjs/testing';
import { SourcesDataService } from './sources-data.service';

describe('SourcesDataService', () => {
  let service: SourcesDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SourcesDataService],
    }).compile();

    service = module.get<SourcesDataService>(SourcesDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
