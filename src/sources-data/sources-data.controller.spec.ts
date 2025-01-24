import { Test, TestingModule } from '@nestjs/testing';
import { SourcesDataController } from './sources-data.controller';
import { SourcesDataService } from './sources-data.service';

describe('SourcesDataController', () => {
  let controller: SourcesDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourcesDataController],
      providers: [SourcesDataService],
    }).compile();

    controller = module.get<SourcesDataController>(SourcesDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
