import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@rumsan/prisma';
import { ActivityService } from 'src/activity/activity.service';
import { StatsModule } from './stat.module';
import { StatsService } from './stat.service';
import { StatsController } from './stats.controller';

describe('StatsModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    phase: { findMany: jest.fn() },
    activity: { groupBy: jest.fn(), count: jest.fn() },
    stats: { upsert: jest.fn(), findMany: jest.fn() },
  };

  const mockActivityService = {
    getTransportSessionStatsByGroup: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StatsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(ActivityService)
      .useValue(mockActivityService)
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have StatsService defined', () => {
    const statsService = module.get<StatsService>(StatsService);
    expect(statsService).toBeDefined();
  });

  it('should have StatsController defined', () => {
    const statsController = module.get<StatsController>(StatsController);
    expect(statsController).toBeDefined();
  });

  it('should export StatsService', () => {
    const statsService = module.get<StatsService>(StatsService);
    expect(statsService).toBeInstanceOf(StatsService);
  });

  describe('Module Dependencies', () => {
    it('should have PrismaService available', () => {
      const prismaService = module.get<PrismaService>(PrismaService);
      expect(prismaService).toBeDefined();
    });

    it('should have ActivityService available', () => {
      const activityService = module.get<ActivityService>(ActivityService);
      expect(activityService).toBeDefined();
    });
  });
}); 