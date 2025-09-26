import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthCacheService } from './health-cache.service';
import {
  SourceHealthData,
  SourceConfig,
  HealthCacheData,
  SourceStatus,
  SourceValidity,
} from './dto/health.type';

describe('HealthCacheService', () => {
  let service: HealthCacheService;
  let mockRedis: any;

  const mockSourceConfig: SourceConfig = {
    source_id: 'TEST_SOURCE',
    name: 'Test Source',
    fetch_interval_minutes: 15,
    stale_threshold_multiplier: 1.5,
  };

  const mockHealthData: SourceHealthData = {
    source_id: 'TEST_SOURCE',
    name: 'Test Source',
    source_url: 'https://api.test.com',
    status: 'HEALTHY',
    last_checked: '2023-01-01T10:00:00.000Z',
    response_time_ms: 250,
    validity: 'VALID',
    errors: null,
  };

  const mockHealthDataWithErrors: SourceHealthData = {
    source_id: 'ERROR_SOURCE',
    name: 'Error Source',
    source_url: 'https://api.error.com',
    status: 'UNHEALTHY',
    last_checked: '2023-01-01T10:00:00.000Z',
    response_time_ms: null,
    validity: 'EXPIRED',
    errors: [
      {
        code: 'API_ERROR',
        message: 'Connection failed',
        timestamp: '2023-01-01T10:00:00.000Z',
      },
    ],
  };

  beforeEach(async () => {
    // Create comprehensive Redis mock
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      pipeline: jest.fn(() => ({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<HealthCacheService>(HealthCacheService);

    // Mock console methods to prevent test output noise
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    // Mock Logger methods
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Mock Date for consistent timestamps (only for non-calculateValidity tests)
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2023-01-01T10:00:00.000Z');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Restore original Date if it was mocked
    if ((global as any).Date !== Date) {
      (global as any).Date = Date;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setSourceConfig', () => {
    it('should set source configuration successfully', async () => {
      mockRedis.get.mockResolvedValue(null); // No existing config
      mockRedis.set.mockResolvedValue('OK');

      await service.setSourceConfig(mockSourceConfig);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'health:config:TEST_SOURCE',
        JSON.stringify(mockSourceConfig),
      );
    });

    it('should delete existing config before setting new one', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSourceConfig)); // Existing config
      mockRedis.del.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');

      await service.setSourceConfig(mockSourceConfig);

      expect(mockRedis.del).toHaveBeenCalledWith('health:config:TEST_SOURCE');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'health:config:TEST_SOURCE',
        JSON.stringify(mockSourceConfig),
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockResolvedValue(null); // getSourceConfig succeeds
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      await service.setSourceConfig(mockSourceConfig);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to cache source config for TEST_SOURCE:',
        expect.any(Error),
      );
    });

    it('should handle set operation errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('Set operation failed'));

      await service.setSourceConfig(mockSourceConfig);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to cache source config for TEST_SOURCE:',
        expect.any(Error),
      );
    });
  });

  describe('getSourceConfig', () => {
    it('should get source configuration successfully', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSourceConfig));

      const result = await service.getSourceConfig('TEST_SOURCE');

      expect(result).toEqual(mockSourceConfig);
      expect(mockRedis.get).toHaveBeenCalledWith('health:config:TEST_SOURCE');
    });

    it('should return null when config does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSourceConfig('TEST_SOURCE');

      expect(result).toBeNull();
    });

    it('should handle Redis errors and return null', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getSourceConfig('TEST_SOURCE');

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get source config for TEST_SOURCE:',
        expect.any(Error),
      );
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.getSourceConfig('TEST_SOURCE');

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get source config for TEST_SOURCE:',
        expect.any(Error),
      );
    });
  });

  describe('calculateTTL', () => {
    it('should calculate TTL based on source configuration', async () => {
      jest
        .spyOn(service, 'getSourceConfig')
        .mockResolvedValue(mockSourceConfig);

      // Access private method through service instance
      const ttl = await (service as any).calculateTTL('TEST_SOURCE');

      // Expected calculation: 15 * 1.5 * 1.2 * 60 = 1620 seconds
      expect(ttl).toBe(1620);
    });

    it('should use default TTL when no source config found', async () => {
      jest.spyOn(service, 'getSourceConfig').mockResolvedValue(null);

      const ttl = await (service as any).calculateTTL('TEST_SOURCE');

      expect(ttl).toBe(1200); // Default TTL
    });

    it('should use default stale multiplier when not provided', async () => {
      const configWithoutMultiplier = {
        ...mockSourceConfig,
        stale_threshold_multiplier: undefined,
      };
      jest
        .spyOn(service, 'getSourceConfig')
        .mockResolvedValue(configWithoutMultiplier);

      const ttl = await (service as any).calculateTTL('TEST_SOURCE');

      // Expected calculation with default multiplier 1.5: 15 * 1.5 * 1.2 * 60 = 1620
      expect(ttl).toBe(1620);
    });

    it('should handle errors and return default TTL', async () => {
      jest
        .spyOn(service, 'getSourceConfig')
        .mockRejectedValue(new Error('Config error'));

      const ttl = await (service as any).calculateTTL('TEST_SOURCE');

      expect(ttl).toBe(1200);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to calculate TTL for TEST_SOURCE:',
        expect.any(Error),
      );
    });

    it('should round up TTL to nearest integer', async () => {
      const configWithDecimal = {
        ...mockSourceConfig,
        fetch_interval_minutes: 7, // Will result in decimal TTL
      };
      jest
        .spyOn(service, 'getSourceConfig')
        .mockResolvedValue(configWithDecimal);

      const ttl = await (service as any).calculateTTL('TEST_SOURCE');

      // Expected calculation: 7 * 1.5 * 1.2 * 60 = 756, should be rounded up
      expect(ttl).toBe(756);
      expect(Number.isInteger(ttl)).toBe(true);
    });
  });

  describe('setSourceHealth', () => {
    it('should set source health data successfully', async () => {
      jest.spyOn(service as any, 'calculateTTL').mockResolvedValue(1800);
      jest.spyOn(service as any, 'calculateFetchFrequency').mockResolvedValue(15);
      jest
        .spyOn(service as any, 'updateHealthSummary')
        .mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');

      await service.setSourceHealth('TEST_SOURCE', mockHealthData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'health:source:TEST_SOURCE',
        1800,
        JSON.stringify(mockHealthData),
      );
      expect(service['updateHealthSummary']).toHaveBeenCalled();
    });

    it('should handle Redis setex errors', async () => {
      jest.spyOn(service as any, 'calculateTTL').mockResolvedValue(1800);
      jest.spyOn(service as any, 'calculateFetchFrequency').mockResolvedValue(15);
      mockRedis.setex.mockRejectedValue(new Error('Redis setex failed'));

      await expect(
        service.setSourceHealth('TEST_SOURCE', mockHealthData),
      ).rejects.toThrow('Redis setex failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to cache health data for TEST_SOURCE:',
        expect.any(Error),
      );
    });

    it('should handle calculateTTL errors', async () => {
      jest
        .spyOn(service as any, 'calculateTTL')
        .mockRejectedValue(new Error('TTL calculation failed'));

      await expect(
        service.setSourceHealth('TEST_SOURCE', mockHealthData),
      ).rejects.toThrow('TTL calculation failed');
    });
  });

  describe('getSourceHealth', () => {
    it('should get source health data successfully', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockHealthData));

      const result = await service.getSourceHealth('TEST_SOURCE');

      expect(result).toEqual(mockHealthData);
      expect(mockRedis.get).toHaveBeenCalledWith('health:source:TEST_SOURCE');
    });

    it('should return null when health data does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSourceHealth('TEST_SOURCE');

      expect(result).toBeNull();
    });

    it('should handle Redis errors and return null', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis get failed'));

      const result = await service.getSourceHealth('TEST_SOURCE');

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get health data for TEST_SOURCE:',
        expect.any(Error),
      );
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.getSourceHealth('TEST_SOURCE');

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get health data for TEST_SOURCE:',
        expect.any(Error),
      );
    });
  });

  describe('getAllSourcesHealth', () => {
    it('should get all sources health data successfully', async () => {
      const keys = ['health:source:SOURCE1', 'health:source:SOURCE2'];
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ ...mockHealthData, source_id: 'SOURCE1' })],
          [null, JSON.stringify({ ...mockHealthData, source_id: 'SOURCE2' })],
        ]),
      };

      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getAllSourcesHealth();

      expect(result).toHaveLength(2);
      expect(result[0].source_id).toBe('SOURCE1');
      expect(result[1].source_id).toBe('SOURCE2');
      expect(mockRedis.keys).toHaveBeenCalledWith('health:source:*');
      expect(mockPipeline.get).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no sources found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getAllSourcesHealth();

      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'No sources health data found in CACHE',
      );
    });

    it('should filter out failed pipeline results', async () => {
      const keys = ['health:source:SOURCE1', 'health:source:SOURCE2'];
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ ...mockHealthData, source_id: 'SOURCE1' })],
          [new Error('Pipeline error'), null], // This should be filtered out
        ]),
      };

      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getAllSourcesHealth();

      expect(result).toHaveLength(1);
      expect(result[0].source_id).toBe('SOURCE1');
    });

    it('should sort results by source_id', async () => {
      const keys = ['health:source:ZEBRA', 'health:source:ALPHA'];
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ ...mockHealthData, source_id: 'ZEBRA' })],
          [null, JSON.stringify({ ...mockHealthData, source_id: 'ALPHA' })],
        ]),
      };

      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getAllSourcesHealth();

      expect(result[0].source_id).toBe('ALPHA');
      expect(result[1].source_id).toBe('ZEBRA');
    });

    it('should handle Redis errors and return empty array', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis keys failed'));

      const result = await service.getAllSourcesHealth();

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get all sources health:',
        expect.any(Error),
      );
    });

    it('should handle pipeline execution errors', async () => {
      const keys = ['health:source:SOURCE1'];
      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline exec failed')),
      };

      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getAllSourcesHealth();

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get all sources health:',
        expect.any(Error),
      );
    });
  });

  describe('updateHealthSummary', () => {
    it('should update health summary successfully', async () => {
      const sources = [mockHealthData];
      jest.spyOn(service, 'getAllSourcesHealth').mockResolvedValue(sources);
      jest
        .spyOn(service as any, 'calculateOverallStatus')
        .mockReturnValue('HEALTHY');
      mockRedis.setex.mockResolvedValue('OK');

      await (service as any).updateHealthSummary();

      const expectedSummary: HealthCacheData = {
        overall_status: 'HEALTHY',
        last_updated: '2023-01-01T10:00:00.000Z',
        sources,
      };

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'health:summary',
        1200,
        JSON.stringify(expectedSummary),
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(service, 'getAllSourcesHealth')
        .mockRejectedValue(new Error('Get sources failed'));

      await (service as any).updateHealthSummary();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to update health summary:',
        expect.any(Error),
      );
    });
  });

  describe('getHealthSummary', () => {
    it('should return cached summary when available and not DOWN', async () => {
      const cachedSummary: HealthCacheData = {
        overall_status: 'HEALTHY',
        last_updated: '2023-01-01T09:00:00.000Z',
        sources: [mockHealthData],
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSummary));

      const result = await service.getHealthSummary();

      expect(result).toEqual(cachedSummary);
      expect(mockRedis.get).toHaveBeenCalledWith('health:summary');
    });

    it('should regenerate summary when cached summary is DOWN', async () => {
      const cachedSummary: HealthCacheData = {
        overall_status: 'UNHEALTHY',
        last_updated: '2023-01-01T09:00:00.000Z',
        sources: [],
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSummary));
      jest
        .spyOn(service, 'getAllSourcesHealth')
        .mockResolvedValue([mockHealthData]);
      jest
        .spyOn(service as any, 'calculateOverallStatus')
        .mockReturnValue('HEALTHY');
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getHealthSummary();

      expect(result.overall_status).toBe('HEALTHY');
      expect(result.sources).toEqual([mockHealthData]);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should generate fresh summary when no cached summary exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      jest
        .spyOn(service, 'getAllSourcesHealth')
        .mockResolvedValue([mockHealthData]);
      jest
        .spyOn(service as any, 'calculateOverallStatus')
        .mockReturnValue('HEALTHY');
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getHealthSummary();

      expect(result.overall_status).toBe('HEALTHY');
      expect(result.sources).toEqual([mockHealthData]);
    });

    it('should return DOWN status when errors occur', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis get failed'));

      const result = await service.getHealthSummary();

      expect(result.overall_status).toBe('UNHEALTHY');
      expect(result.sources).toEqual([]);
      expect(result.last_updated).toBe('2023-01-01T10:00:00.000Z');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get health summary:',
        expect.any(Error),
      );
    });
  });

  describe('calculateOverallStatus', () => {
    it('should return DOWN when no sources exist', () => {
      const result = (service as any).calculateOverallStatus([]);
      expect(result).toBe('UNHEALTHY');
    });

    it('should return HEALTHY when all sources are HEALTHY', () => {
      const sources = [
        { ...mockHealthData, status: 'HEALTHY' },
        { ...mockHealthData, status: 'HEALTHY' },
      ];
      const result = (service as any).calculateOverallStatus(sources);
      expect(result).toBe('HEALTHY');
    });

    it('should return DOWN when more than half sources are DOWN', () => {
      const sources = [
        { ...mockHealthData, status: 'UNHEALTHY' },
        { ...mockHealthData, status: 'UNHEALTHY' },
        { ...mockHealthData, status: 'HEALTHY' },
      ];
      const result = (service as any).calculateOverallStatus(sources);
      expect(result).toBe('UNHEALTHY');
    });

    it('should return DEGRADED when some issues but not critical', () => {
      const sources = [
        { ...mockHealthData, status: 'HEALTHY' },
        { ...mockHealthData, status: 'DEGRADED' },
        { ...mockHealthData, status: 'HEALTHY' },
      ];
      const result = (service as any).calculateOverallStatus(sources);
      expect(result).toBe('DEGRADED');
    });

    it('should return DEGRADED when exactly half sources are UNHEALTHY', () => {
      const sources = [
        { ...mockHealthData, status: 'UNHEALTHY' },
        { ...mockHealthData, status: 'HEALTHY' },
      ];
      const result = (service as any).calculateOverallStatus(sources);
      expect(result).toBe('DEGRADED');
    });
  });

  describe('removeSourceHealth', () => {
    it('should remove source health data successfully', async () => {
      jest
        .spyOn(service as any, 'updateHealthSummary')
        .mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(1);

      await service.removeSourceHealth('TEST_SOURCE');

      expect(mockRedis.del).toHaveBeenCalledWith('health:source:TEST_SOURCE');
      expect(service['updateHealthSummary']).toHaveBeenCalled();
    });

    it('should handle Redis delete errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis del failed'));

      await service.removeSourceHealth('TEST_SOURCE');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to remove health data for TEST_SOURCE:',
        expect.any(Error),
      );
    });
  });

  describe('createHealthData', () => {
    it('should create health data with all parameters', async () => {
      jest
        .spyOn(service as any, 'calculateValidity')
        .mockResolvedValue('VALID');

      const result = await service.createHealthData({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source',
        sourceUrl: 'https://api.test.com',
        status: 'HEALTHY',
        responseTimeMs: 250,
        errors: [
          {
            code: 'TEST',
            message: 'Test error',
            timestamp: '2023-01-01T10:00:00.000Z',
          },
        ],
      });

      expect(result).toEqual({
        source_id: 'TEST_SOURCE',
        name: 'Test Source',
        source_url: 'https://api.test.com',
        status: 'HEALTHY',
        last_checked: '2023-01-01T10:00:00.000Z',
        response_time_ms: 250,
        validity: 'VALID',
        errors: [
          {
            code: 'TEST',
            message: 'Test error',
            timestamp: '2023-01-01T10:00:00.000Z',
          },
        ],
      });
    });

    it('should create health data with default values', async () => {
      jest
        .spyOn(service as any, 'calculateValidity')
        .mockResolvedValue('STALE');

      const result = await service.createHealthData({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source',
        sourceUrl: 'https://api.test.com',
        status: 'UNHEALTHY',
      });

      expect(result).toEqual({
        source_id: 'TEST_SOURCE',
        name: 'Test Source',
        source_url: 'https://api.test.com',
        status: 'UNHEALTHY',
        last_checked: '2023-01-01T10:00:00.000Z',
        response_time_ms: null,
        validity: 'STALE',
        errors: null,
      });
    });
  });
});
