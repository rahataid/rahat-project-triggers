import { Test, TestingModule } from '@nestjs/testing';
import { DailyMonitoringService } from './daily-monitoring.service';

describe('DailyMonitoringService', () => {
  let service: DailyMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyMonitoringService],
    }).compile();

    service = module.get<DailyMonitoringService>(DailyMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
