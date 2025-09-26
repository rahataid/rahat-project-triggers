import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  HealthUtilsService,
  HealthError,
  HealthCheckConfig,
} from './health-utils.service';
import { HealthCacheService } from 'src/source/health-cache.service';

describe('HealthUtilsService', () => {
  let service: HealthUtilsService;
  let healthCacheService: HealthCacheService;
  let loggerSpy: jest.SpyInstance;

  const mockHealthCacheService = {
    createHealthData: jest.fn(),
    setSourceHealth: jest.fn(),
  };

  const mockConfig: HealthCheckConfig = {
    sourceId: 'TEST_SOURCE',
    name: 'Test Source API',
    sourceUrl: 'https://api.test.com',
    startTimestamp: new Date('2023-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthUtilsService,
        {
          provide: HealthCacheService,
          useValue: mockHealthCacheService,
        },
      ],
    }).compile();

    service = module.get<HealthUtilsService>(HealthUtilsService);
    healthCacheService = module.get<HealthCacheService>(HealthCacheService);

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock Date.now for consistent timestamps
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2023-01-01T10:05:00.000Z');
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(1672574700000); // 2023-01-01T10:05:00Z
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createError', () => {
    it('should create a standardized error object', () => {
      const error = service.createError('TEST_ERROR', 'Test error message');

      expect(error).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error message',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle empty strings', () => {
      const error = service.createError('', '');

      expect(error).toEqual({
        code: '',
        message: '',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle special characters in code and message', () => {
      const error = service.createError(
        'ERROR_WITH_SPECIAL_CHARS!@#',
        'Message with special chars: <>&"',
      );

      expect(error).toEqual({
        code: 'ERROR_WITH_SPECIAL_CHARS!@#',
        message: 'Message with special chars: <>&"',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });
  });

  describe('calculateHealthStatus', () => {
    it('should return UNHEALTHY when no stations are successful', () => {
      const status = service.calculateHealthStatus(0, 5, false);
      expect(status).toBe('UNHEALTHY');
    });

    it('should return UNHEALTHY when no stations are successful even with errors', () => {
      const status = service.calculateHealthStatus(0, 5, true);
      expect(status).toBe('UNHEALTHY');
    });

    it('should return DEGRADED when some stations fail', () => {
      const status = service.calculateHealthStatus(3, 5, false);
      expect(status).toBe('DEGRADED');
    });

    it('should return DEGRADED when all stations succeed but there are errors', () => {
      const status = service.calculateHealthStatus(5, 5, true);
      expect(status).toBe('DEGRADED');
    });

    it('should return HEALTHY when all stations succeed with no errors', () => {
      const status = service.calculateHealthStatus(5, 5, false);
      expect(status).toBe('HEALTHY');
    });

    it('should handle edge case with single station success', () => {
      const status = service.calculateHealthStatus(1, 1, false);
      expect(status).toBe('HEALTHY');
    });

    it('should handle edge case with zero total stations', () => {
      const status = service.calculateHealthStatus(0, 0, false);
      expect(status).toBe('UNHEALTHY');
    });
  });

  describe('validateSettings', () => {
    beforeEach(() => {
      mockHealthCacheService.createHealthData.mockResolvedValue({
        sourceId: 'TEST_SOURCE',
        status: 'UNHEALTHY',
      });
      mockHealthCacheService.setSourceHealth.mockResolvedValue(undefined);
    });

    it('should return true for valid settings', async () => {
      const settings = [{ id: 1 }, { id: 2 }];
      const result = await service.validateSettings(
        settings,
        mockConfig,
        'TEST',
      );

      expect(result).toBe(true);
      expect(mockHealthCacheService.createHealthData).not.toHaveBeenCalled();
      expect(mockHealthCacheService.setSourceHealth).not.toHaveBeenCalled();
    });

    it('should return false and create error health data for null settings', async () => {
      const result = await service.validateSettings(null, mockConfig, 'TEST');

      expect(result).toBe(false);
      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source API',
        sourceUrl: 'https://api.test.com',
        status: 'UNHEALTHY',
        responseTimeMs: 0,
        errors: [
          {
            code: 'TEST_CONFIG_ERROR',
            message: 'TEST settings not found or empty',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
      });
      expect(mockHealthCacheService.setSourceHealth).toHaveBeenCalledWith(
        'TEST_SOURCE',
        {
          sourceId: 'TEST_SOURCE',
          status: 'UNHEALTHY',
        },
      );
    });

    it('should return false and create error health data for undefined settings', async () => {
      const result = await service.validateSettings(
        undefined,
        mockConfig,
        'DHM',
      );

      expect(result).toBe(false);
      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source API',
        sourceUrl: 'https://api.test.com',
        status: 'UNHEALTHY',
        responseTimeMs: 0,
        errors: [
          {
            code: 'DHM_CONFIG_ERROR',
            message: 'DHM settings not found or empty',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
      });
    });

    it('should return false and create error health data for empty array settings', async () => {
      const result = await service.validateSettings([], mockConfig, 'GLOFAS');

      expect(result).toBe(false);
      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            {
              code: 'GLOFAS_CONFIG_ERROR',
              message: 'GLOFAS settings not found or empty',
              timestamp: '2023-01-01T10:05:00.000Z',
            },
          ],
        }),
      );
    });

    it('should log warning for invalid settings', async () => {
      await service.validateSettings(null, mockConfig, 'TEST');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'TEST settings not found or empty',
      );
    });
  });

  describe('storeHealthResult', () => {
    const mockResult = {
      status: 'HEALTHY' as const,
      successfulStations: 8,
      totalStations: 10,
      errors: [],
      duration: 5000,
    };

    beforeEach(() => {
      mockHealthCacheService.createHealthData.mockResolvedValue({
        sourceId: 'TEST_SOURCE',
        status: 'HEALTHY',
      });
      mockHealthCacheService.setSourceHealth.mockResolvedValue(undefined);
    });

    it('should store health result with no errors', async () => {
      await service.storeHealthResult(mockConfig, mockResult);

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source API',
        sourceUrl: 'https://api.test.com',
        status: 'HEALTHY',
        responseTimeMs: 5000,
        errors: null,
      });
      expect(mockHealthCacheService.setSourceHealth).toHaveBeenCalledWith(
        'TEST_SOURCE',
        {
          sourceId: 'TEST_SOURCE',
          status: 'HEALTHY',
        },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Test Source API health data updated - 8/10 stations successful',
      );
    });

    it('should store health result with errors', async () => {
      const resultWithErrors = {
        ...mockResult,
        status: 'DEGRADED' as const,
        errors: [
          {
            code: 'STATION_ERROR',
            message: 'Station failed',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
      };

      await service.storeHealthResult(mockConfig, resultWithErrors);

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source API',
        sourceUrl: 'https://api.test.com',
        status: 'DEGRADED',
        responseTimeMs: 5000,
        errors: [
          {
            code: 'STATION_ERROR',
            message: 'Station failed',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
      });
    });

    it('should handle empty errors array', async () => {
      const resultWithEmptyErrors = {
        ...mockResult,
        errors: [],
      };

      await service.storeHealthResult(mockConfig, resultWithEmptyErrors);

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: null,
        }),
      );
    });
  });

  describe('handleTopLevelError', () => {
    beforeEach(() => {
      mockHealthCacheService.createHealthData.mockResolvedValue({
        sourceId: 'TEST_SOURCE',
        status: 'UNHEALTHY',
      });
      mockHealthCacheService.setSourceHealth.mockResolvedValue(undefined);
    });

    it('should handle simple error with message', async () => {
      const error = new Error('Simple error message');

      await service.handleTopLevelError(mockConfig, error, 'TEST_ERROR');

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith({
        sourceId: 'TEST_SOURCE',
        name: 'Test Source API',
        sourceUrl: 'https://api.test.com',
        status: 'UNHEALTHY',
        responseTimeMs: 0,
        errors: [
          {
            code: 'TEST_ERROR',
            message: 'Simple error message',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error in Test Source API:',
        'Simple error message',
      );
    });

    it('should handle axios-like error with response data', async () => {
      const error = {
        response: {
          data: {
            message: 'API response error message',
          },
        },
        message: 'Fallback message',
      };

      await service.handleTopLevelError(mockConfig, error, 'API_ERROR');

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            {
              code: 'API_ERROR',
              message: 'API response error message',
              timestamp: '2023-01-01T10:05:00.000Z',
            },
          ],
        }),
      );
    });

    it('should fall back to error.message when response.data.message is not available', async () => {
      const error = {
        response: {
          data: {},
        },
        message: 'Fallback error message',
      };

      await service.handleTopLevelError(mockConfig, error, 'FALLBACK_ERROR');

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            {
              code: 'FALLBACK_ERROR',
              message: 'Fallback error message',
              timestamp: '2023-01-01T10:05:00.000Z',
            },
          ],
        }),
      );
    });

    it('should handle error without message property', async () => {
      const error = { someOtherProperty: 'value' };

      await service.handleTopLevelError(mockConfig, error, 'NO_MESSAGE_ERROR');

      expect(mockHealthCacheService.createHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            {
              code: 'NO_MESSAGE_ERROR',
              message: undefined,
              timestamp: '2023-01-01T10:05:00.000Z',
            },
          ],
        }),
      );
    });
  });

  describe('processStationsInParallel', () => {
    it('should process all stations successfully', async () => {
      const stations = ['station1', 'station2', 'station3'];
      const mockProcessor = jest.fn().mockResolvedValue(true);

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(mockProcessor).toHaveBeenCalledTimes(3);
      expect(mockProcessor).toHaveBeenCalledWith('station1', []);
      expect(mockProcessor).toHaveBeenCalledWith('station2', []);
      expect(mockProcessor).toHaveBeenCalledWith('station3', []);
      expect(result).toEqual({
        status: 'HEALTHY',
        successfulStations: 3,
        totalStations: 3,
        errors: [],
        duration: expect.any(Number),
      });
    });

    it('should handle mixed success and failure', async () => {
      const stations = ['station1', 'station2', 'station3'];
      const mockProcessor = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(result).toEqual({
        status: 'DEGRADED',
        successfulStations: 2,
        totalStations: 3,
        errors: [],
        duration: expect.any(Number),
      });
    });

    it('should handle all stations failing', async () => {
      const stations = ['station1', 'station2'];
      const mockProcessor = jest.fn().mockResolvedValue(false);

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(result).toEqual({
        status: 'UNHEALTHY',
        successfulStations: 0,
        totalStations: 2,
        errors: [],
        duration: expect.any(Number),
      });
    });

    it('should handle processor throwing errors', async () => {
      const stations = ['station1', 'station2'];
      const mockProcessor = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Processor error'));

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(result).toEqual({
        status: 'DEGRADED',
        successfulStations: 1,
        totalStations: 2,
        errors: [],
        duration: expect.any(Number),
      });
    });

    it('should handle empty stations array', async () => {
      const stations: string[] = [];
      const mockProcessor = jest.fn();

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(mockProcessor).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'UNHEALTHY',
        successfulStations: 0,
        totalStations: 0,
        errors: [],
        duration: expect.any(Number),
      });
    });

    it('should allow processor to add errors to the errors array', async () => {
      const stations = ['station1'];
      const mockProcessor = jest
        .fn()
        .mockImplementation(async (station, errors: HealthError[]) => {
          errors.push({
            code: 'STATION_ERROR',
            message: 'Station processing failed',
            timestamp: '2023-01-01T10:05:00.000Z',
          });
          return false;
        });

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(result).toEqual({
        status: 'UNHEALTHY',
        successfulStations: 0,
        totalStations: 1,
        errors: [
          {
            code: 'STATION_ERROR',
            message: 'Station processing failed',
            timestamp: '2023-01-01T10:05:00.000Z',
          },
        ],
        duration: expect.any(Number),
      });
    });

    it('should handle complex station objects', async () => {
      const stations = [
        { id: 1, name: 'Station 1' },
        { id: 2, name: 'Station 2' },
      ];
      const mockProcessor = jest.fn().mockResolvedValue(true);

      const result = await service.processStationsInParallel(
        stations,
        mockProcessor,
      );

      expect(mockProcessor).toHaveBeenCalledWith(
        { id: 1, name: 'Station 1' },
        [],
      );
      expect(mockProcessor).toHaveBeenCalledWith(
        { id: 2, name: 'Station 2' },
        [],
      );
      expect(result.successfulStations).toBe(2);
    });
  });
});
