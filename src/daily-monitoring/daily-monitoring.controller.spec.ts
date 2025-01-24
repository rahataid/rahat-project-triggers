import { Test, TestingModule } from '@nestjs/testing';
import { DailyMonitoringController } from './daily-monitoring.controller';
import { DailyMonitoringService } from './daily-monitoring.service';

describe('DailyMonitoringController', () => {
  let controller: DailyMonitoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyMonitoringController],
      providers: [DailyMonitoringService],
    }).compile();

    controller = module.get<DailyMonitoringController>(DailyMonitoringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
