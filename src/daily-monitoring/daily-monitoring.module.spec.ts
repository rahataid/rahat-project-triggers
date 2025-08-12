import { Test, TestingModule } from '@nestjs/testing';
import { DailyMonitoringModule } from './daily-monitoring.module';
import { DailyMonitoringController } from './daily-monitoring.controller';
import { DailyMonitoringService } from './daily-monitoring.service';
import { PrismaService } from '@rumsan/prisma';

describe('DailyMonitoringModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    dailyMonitoring: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DailyMonitoringModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have DailyMonitoringController defined', () => {
    const controller = module.get<DailyMonitoringController>(DailyMonitoringController);
    expect(controller).toBeDefined();
  });

  it('should have DailyMonitoringService defined', () => {
    const service = module.get<DailyMonitoringService>(DailyMonitoringService);
    expect(service).toBeDefined();
  });

  it('should have PrismaService defined', () => {
    const prismaService = module.get<PrismaService>(PrismaService);
    expect(prismaService).toBeDefined();
  });

  describe('Module Structure', () => {
    it('should be a valid NestJS module', () => {
      expect(DailyMonitoringModule).toBeDefined();
      expect(typeof DailyMonitoringModule).toBe('function');
    });

    it('should have the correct module metadata', () => {
      const metadata = Reflect.getMetadata('controllers', DailyMonitoringModule);
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toContain(DailyMonitoringController);
    });

    it('should have the correct providers metadata', () => {
      const metadata = Reflect.getMetadata('providers', DailyMonitoringModule);
      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata).toContain(DailyMonitoringService);
    });
  });
}); 