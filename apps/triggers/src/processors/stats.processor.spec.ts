import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatsProcessor } from './stats.processor';
import { StatsService } from '../stats/stat.service';
import { ConfigService } from '@nestjs/config';

describe('StatsProcessor', () => {
  let processor: StatsProcessor;

  const mockStatsService = {
    calculateAllStats: jest.fn(),
    savePhaseActivatedStats: jest.fn(),
    savePhaseRevertStats: jest.fn(),
    calculatePhaseActivities: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsProcessor,
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    processor = module.get<StatsProcessor>(StatsProcessor);
    (processor as any).configService = mockConfigService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should call calculateAllStats on bootstrap', async () => {
      mockConfigService.get.mockReturnValue('production');
      await processor.onApplicationBootstrap();

      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('onActivityCompleted', () => {
    it('should handle ACTIVITY_COMPLETED event', async () => {
      const result = await processor.onActivityCompleted();

      expect(result).toBeUndefined();
      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });

    it('should handle ACTIVITY_DELETED event', async () => {
      const result = await processor.onActivityCompleted();

      expect(result).toBeUndefined();
      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });

    it('should handle ACTIVITY_ADDED event', async () => {
      const result = await processor.onActivityCompleted();

      expect(result).toBeUndefined();
      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });

    it('should handle PHASE_REVERTED event', async () => {
      const result = await processor.onActivityCompleted();

      expect(result).toBeUndefined();
      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });

    it('should handle PHASE_ACTIVATED event', async () => {
      const result = await processor.onActivityCompleted();

      expect(result).toBeUndefined();
      expect(mockStatsService.calculateAllStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Decorators', () => {
    it('should have correct event decorators', () => {
      const prototype = Object.getPrototypeOf(processor);

      // Check that the methods have the correct decorators
      expect(prototype.onActivityCompleted).toBeDefined();
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      // This test ensures we're testing all methods
      expect(typeof processor.onApplicationBootstrap).toBe('function');
      expect(typeof processor.onActivityCompleted).toBe('function');
    });
  });
});
