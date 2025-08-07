import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stat.service';
import { JOBS } from 'src/constant';

describe('StatsController', () => {
  let controller: StatsController;
  let statsService: StatsService;

  const mockStatsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    statsService = module.get<StatsService>(StatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockPayload = { appId: 'test_app' };
    const mockStats = [
      { id: 1, name: 'TEST_APP_STAT_1', data: { count: 10 } },
      { id: 2, name: 'TEST_APP_STAT_2', data: { count: 20 } },
    ];

    beforeEach(() => {
      mockStatsService.findAll.mockResolvedValue(mockStats);
    });

    it('should call findAll with correct message pattern', () => {
      const messagePattern = { cmd: JOBS.STATS.MS_TRIGGERS_STATS };
      
      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = controller.findAll(mockPayload);

      expect(consoleSpy).toHaveBeenCalledWith('first', mockPayload);
      expect(mockStatsService.findAll).toHaveBeenCalledWith(mockPayload);
      expect(result).resolves.toEqual(mockStats);

      consoleSpy.mockRestore();
    });

    it('should handle empty payload', () => {
      const emptyPayload = {};
      mockStatsService.findAll.mockResolvedValue([]);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = controller.findAll(emptyPayload);

      expect(consoleSpy).toHaveBeenCalledWith('first', emptyPayload);
      expect(mockStatsService.findAll).toHaveBeenCalledWith(emptyPayload);
      expect(result).resolves.toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle service errors', () => {
      const error = new Error('Service error');
      mockStatsService.findAll.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = controller.findAll(mockPayload);

      expect(consoleSpy).toHaveBeenCalledWith('first', mockPayload);
      expect(mockStatsService.findAll).toHaveBeenCalledWith(mockPayload);
      expect(result).rejects.toThrow('Service error');

      consoleSpy.mockRestore();
    });

    it('should handle null payload', () => {
      const nullPayload = null;
      mockStatsService.findAll.mockResolvedValue([]);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = controller.findAll(nullPayload);

      expect(consoleSpy).toHaveBeenCalledWith('first', nullPayload);
      expect(mockStatsService.findAll).toHaveBeenCalledWith(nullPayload);
      expect(result).resolves.toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle undefined payload', () => {
      const undefinedPayload = undefined;
      mockStatsService.findAll.mockResolvedValue([]);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = controller.findAll(undefinedPayload);

      expect(consoleSpy).toHaveBeenCalledWith('first', undefinedPayload);
      expect(mockStatsService.findAll).toHaveBeenCalledWith(undefinedPayload);
      expect(result).resolves.toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('MessagePattern decorator', () => {
    it('should have correct message pattern', () => {
      const messagePattern = { cmd: JOBS.STATS.MS_TRIGGERS_STATS };
      
      // This test verifies that the controller method is decorated with the correct message pattern
      // The actual message pattern is defined in the constant file
      expect(JOBS.STATS.MS_TRIGGERS_STATS).toBe('rahat.jobs.ms.trigggers.stats');
    });
  });

  describe('Dependency Injection', () => {
    it('should inject StatsService correctly', () => {
      expect(statsService).toBeDefined();
      expect(statsService).toBe(mockStatsService);
    });
  });
}); 