import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { DhmStationProcessorService, WaterLevelStationConfig, RainfallStationConfig } from './dhm-station-processor.service';
import { DhmService } from '../dhm.service';
import { HealthError } from './health-utils.service';
import { SourceDataTypeEnum } from 'src/types/data-source';

// Mock the buildQueryParams function
jest.mock('src/common', () => ({
  buildQueryParams: jest.fn(),
}));

describe('DhmStationProcessorService', () => {
  let service: DhmStationProcessorService;
  let dhmService: DhmService;
  let httpService: HttpService;
  let buildQueryParamsMock: jest.Mock;

  const mockDhmService = {
    getDhmRiverWatchData: jest.fn(),
    getDhmRainfallWatchData: jest.fn(),
    normalizeDhmRiverAndRainfallWatchData: jest.fn(),
    saveDataInDhm: jest.fn(),
  };

  const mockHttpService = {
    axiosRef: {
      get: jest.fn(),
    },
  };

  const mockWaterLevelConfig: WaterLevelStationConfig = {
    WATER_LEVEL: {
      LOCATION: 'Test River Location',
      SERIESID: [123, 456],
    },
  };

  const mockRainfallConfig: RainfallStationConfig = {
    RAINFALL: {
      LOCATION: 'Test Rainfall Location',
      SERIESID: [789, 101112],
    },
  };

  const mockRiverStationItem = {
    series_id: 123,
    name: 'Test River Station',
    id: 1,
    stationIndex: 'RS001',
    basin: 'Test Basin',
    district: 'Test District',
    latitude: 27.7172,
    longitude: 85.3240,
    waterLevel: 1.5,
    status: 'active',
    warning_level: '2.0',
    danger_level: '3.0',
    steady: 'stable',
    onm: 'operational',
    description: 'Test river station',
    elevation: 100,
    images: [],
    tags: [],
  };

  const mockRainfallStationItem = {
    series_id: 789,
    name: 'Test Rainfall Station',
    id: 2,
    stationIndex: 'RF001',
    status: 'active',
    basin: 'Test Basin',
    district: 'Test District',
    description: 'Test rainfall station',
    latitude: 27.7172,
    longitude: 85.3240,
    value: 5.2,
    interval: 60,
    blink: false,
  };

  beforeEach(async () => {
    // Import and mock buildQueryParams
    buildQueryParamsMock = require('src/common').buildQueryParams;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DhmStationProcessorService,
        {
          provide: DhmService,
          useValue: mockDhmService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<DhmStationProcessorService>(DhmStationProcessorService);
    dhmService = module.get<DhmService>(DhmService);
    httpService = module.get<HttpService>(HttpService);

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock Date.now for consistent timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T10:05:00.000Z');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWaterLevelStation', () => {
    let errors: HealthError[];

    beforeEach(() => {
      errors = [];
      buildQueryParamsMock.mockReturnValue({
        date_from: '2023-01-01',
        date_to: '2023-01-31',
      });
    });

    it('should process water level station successfully', async () => {
      const mockRiverWatchData = [
        { date: '2023-01-01', value: 1.5 },
        { date: '2023-01-02', value: 1.8 },
      ];
      const mockNormalizedData = [
        { datetime: '2023-01-01T00:00:00Z', value: 1.5 },
        { datetime: '2023-01-02T00:00:00Z', value: 1.8 },
      ];

      jest.spyOn(service, 'fetchRiverStation').mockResolvedValue(mockRiverStationItem);
      mockDhmService.getDhmRiverWatchData.mockResolvedValue(mockRiverWatchData);
      mockDhmService.normalizeDhmRiverAndRainfallWatchData.mockResolvedValue(mockNormalizedData);
      mockDhmService.saveDataInDhm.mockResolvedValue(true);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);
      expect(buildQueryParamsMock).toHaveBeenCalledWith(123);
      expect(service.fetchRiverStation).toHaveBeenCalledWith(123);
      expect(mockDhmService.getDhmRiverWatchData).toHaveBeenCalledWith({
        date: '2023-01-01',
        period: SourceDataTypeEnum.POINT.toString(),
        seriesid: '123',
        location: 'Test River Location',
      });
      expect(mockDhmService.normalizeDhmRiverAndRainfallWatchData).toHaveBeenCalledWith(mockRiverWatchData);
      expect(mockDhmService.saveDataInDhm).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'Test River Location',
        {
          ...mockRiverStationItem,
          history: mockNormalizedData,
        },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith('Water level data saved successfully for Test River Location');
    });

    it('should handle missing station data', async () => {
      jest.spyOn(service, 'fetchRiverStation').mockResolvedValue(null);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_WATER_MISSING_DATA',
        message: 'Missing station data or query params for Test River Location',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Missing station data or query params for Test River Location',
      );
    });

    it('should handle missing query params', async () => {
      buildQueryParamsMock.mockReturnValue(null);
      jest.spyOn(service, 'fetchRiverStation').mockResolvedValue(mockRiverStationItem);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_WATER_MISSING_DATA',
        message: 'Missing station data or query params for Test River Location',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle save failure', async () => {
      jest.spyOn(service, 'fetchRiverStation').mockResolvedValue(mockRiverStationItem);
      mockDhmService.getDhmRiverWatchData.mockResolvedValue([]);
      mockDhmService.normalizeDhmRiverAndRainfallWatchData.mockResolvedValue([]);
      mockDhmService.saveDataInDhm.mockResolvedValue(false);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_WATER_SAVE_ERROR',
        message: 'Failed to save water level data for Test River Location',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Failed to save water level data for Test River Location');
    });

    it('should handle fetch error with fallback success', async () => {
      jest.spyOn(service, 'fetchRiverStation')
        .mockResolvedValueOnce(mockRiverStationItem) // First call in main try block
        .mockResolvedValueOnce(mockRiverStationItem); // Second call in fallback
      mockDhmService.getDhmRiverWatchData.mockRejectedValue(new Error('API Error'));
      mockDhmService.saveDataInDhm.mockResolvedValue(true);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(true);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_WATER_FETCH_ERROR',
        message: 'Error fetching water level data for Test River Location: API Error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith('Saved fallback data for Test River Location');
    });

    it('should handle fetch error with fallback failure', async () => {
      jest.spyOn(service, 'fetchRiverStation')
        .mockResolvedValueOnce(mockRiverStationItem)
        .mockResolvedValueOnce(null);
      mockDhmService.getDhmRiverWatchData.mockRejectedValue(new Error('API Error'));

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        "Error while fetching river watch history data Test River Location: 'API Error'",
      );
    });

    it('should handle axios-like error structure', async () => {
      const axiosError = {
        response: {
          data: {
            message: 'API response error',
          },
        },
        message: 'Fallback message',
      };

      jest.spyOn(service, 'fetchRiverStation')
        .mockResolvedValueOnce(mockRiverStationItem) // First call in main try block
        .mockResolvedValueOnce(null); // Second call in fallback
      mockDhmService.getDhmRiverWatchData.mockRejectedValue(axiosError);

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(errors[0].message).toContain('API response error');
    });

    it('should handle fallback save error', async () => {
      jest.spyOn(service, 'fetchRiverStation')
        .mockResolvedValueOnce(mockRiverStationItem)
        .mockResolvedValueOnce(mockRiverStationItem);
      mockDhmService.getDhmRiverWatchData.mockRejectedValue(new Error('API Error'));
      mockDhmService.saveDataInDhm.mockRejectedValue(new Error('Save Error'));

      const result = await service.processWaterLevelStation(mockWaterLevelConfig, 123, errors);

      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to save fallback data for Test River Location:',
        'Save Error',
      );
    });
  });

  describe('processRainfallStation', () => {
    let errors: HealthError[];

    beforeEach(() => {
      errors = [];
      buildQueryParamsMock.mockReturnValue({
        date_from: '2023-01-01',
        date_to: '2023-01-31',
      });
    });

    it('should process rainfall station successfully', async () => {
      const mockRainfallWatchData = [
        { date: '2023-01-01', value: 5.2 },
        { date: '2023-01-02', value: 3.8 },
      ];
      const mockNormalizedData = [
        { datetime: '2023-01-01T00:00:00Z', value: 5.2 },
        { datetime: '2023-01-02T00:00:00Z', value: 3.8 },
      ];

      jest.spyOn(service, 'fetchRainfallStation').mockResolvedValue(mockRainfallStationItem);
      mockDhmService.getDhmRainfallWatchData.mockResolvedValue(mockRainfallWatchData);
      mockDhmService.normalizeDhmRiverAndRainfallWatchData.mockResolvedValue(mockNormalizedData);
      mockDhmService.saveDataInDhm.mockResolvedValue(true);

      const result = await service.processRainfallStation(mockRainfallConfig, 789, errors);

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);
      expect(buildQueryParamsMock).toHaveBeenCalledWith(789);
      expect(service.fetchRainfallStation).toHaveBeenCalledWith(789);
      expect(mockDhmService.getDhmRainfallWatchData).toHaveBeenCalledWith({
        date: '2023-01-01',
        period: SourceDataTypeEnum.HOURLY.toString(),
        seriesid: '789',
        location: 'Test Rainfall Location',
      });
      expect(mockDhmService.saveDataInDhm).toHaveBeenCalledWith(
        SourceType.RAINFALL,
        'Test Rainfall Location',
        {
          ...mockRainfallStationItem,
          history: mockNormalizedData,
        },
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith('Rainfall data saved successfully for Test Rainfall Location');
    });

    it('should handle missing station data', async () => {
      jest.spyOn(service, 'fetchRainfallStation').mockResolvedValue(null);

      const result = await service.processRainfallStation(mockRainfallConfig, 789, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_RAINFALL_MISSING_DATA',
        message: 'Missing station data or query params for Test Rainfall Location',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle save failure', async () => {
      jest.spyOn(service, 'fetchRainfallStation').mockResolvedValue(mockRainfallStationItem);
      mockDhmService.getDhmRainfallWatchData.mockResolvedValue([]);
      mockDhmService.normalizeDhmRiverAndRainfallWatchData.mockResolvedValue([]);
      mockDhmService.saveDataInDhm.mockResolvedValue(false);

      const result = await service.processRainfallStation(mockRainfallConfig, 789, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_RAINFALL_SAVE_ERROR',
        message: 'Failed to save rainfall data for Test Rainfall Location',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle fetch error', async () => {
      jest.spyOn(service, 'fetchRainfallStation').mockResolvedValue(mockRainfallStationItem);
      mockDhmService.getDhmRainfallWatchData.mockRejectedValue(new Error('Rainfall API Error'));

      const result = await service.processRainfallStation(mockRainfallConfig, 789, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'DHM_RAINFALL_FETCH_ERROR',
        message: 'Error fetching rainfall data for Test Rainfall Location: Rainfall API Error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        "Error while fetching rainfall history data for Test Rainfall Location: 'Rainfall API Error'",
      );
    });
  });

  describe('createWaterLevelTasks', () => {
    it('should create tasks for single config with multiple series IDs', () => {
      const configs = [mockWaterLevelConfig];
      const tasks = service.createWaterLevelTasks(configs);

      expect(tasks).toHaveLength(2);
      expect(tasks).toEqual([
        { config: mockWaterLevelConfig, seriesId: 123 },
        { config: mockWaterLevelConfig, seriesId: 456 },
      ]);
    });

    it('should create tasks for multiple configs', () => {
      const config2: WaterLevelStationConfig = {
        WATER_LEVEL: {
          LOCATION: 'Another Location',
          SERIESID: [999],
        },
      };
      const configs = [mockWaterLevelConfig, config2];
      const tasks = service.createWaterLevelTasks(configs);

      expect(tasks).toHaveLength(3);
      expect(tasks).toEqual([
        { config: mockWaterLevelConfig, seriesId: 123 },
        { config: mockWaterLevelConfig, seriesId: 456 },
        { config: config2, seriesId: 999 },
      ]);
    });

    it('should handle empty configs array', () => {
      const tasks = service.createWaterLevelTasks([]);
      expect(tasks).toHaveLength(0);
    });

    it('should handle config with empty SERIESID array', () => {
      const configWithEmptySeriesId: WaterLevelStationConfig = {
        WATER_LEVEL: {
          LOCATION: 'Empty Location',
          SERIESID: [],
        },
      };
      const tasks = service.createWaterLevelTasks([configWithEmptySeriesId]);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('createRainfallTasks', () => {
    it('should create tasks for single config with multiple series IDs', () => {
      const configs = [mockRainfallConfig];
      const tasks = service.createRainfallTasks(configs);

      expect(tasks).toHaveLength(2);
      expect(tasks).toEqual([
        { config: mockRainfallConfig, seriesId: 789 },
        { config: mockRainfallConfig, seriesId: 101112 },
      ]);
    });

    it('should create tasks for multiple configs', () => {
      const config2: RainfallStationConfig = {
        RAINFALL: {
          LOCATION: 'Another Rainfall Location',
          SERIESID: [888],
        },
      };
      const configs = [mockRainfallConfig, config2];
      const tasks = service.createRainfallTasks(configs);

      expect(tasks).toHaveLength(3);
      expect(tasks).toEqual([
        { config: mockRainfallConfig, seriesId: 789 },
        { config: mockRainfallConfig, seriesId: 101112 },
        { config: config2, seriesId: 888 },
      ]);
    });

    it('should handle empty configs array', () => {
      const tasks = service.createRainfallTasks([]);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('fetchRainfallStation', () => {
    it('should fetch rainfall station successfully', async () => {
      const mockApiResponse = {
        data: {
          data: [
            [
              mockRainfallStationItem,
              { series_id: 999, name: 'Other Station' },
            ],
          ],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRainfallStation(789);

      expect(result).toEqual(mockRainfallStationItem);
      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith(
        expect.stringContaining('getRainfallFilter'),
        { httpsAgent: expect.any(Object) },
      );
    });

    it('should return null when station not found', async () => {
      const mockApiResponse = {
        data: {
          data: [
            [
              { series_id: 999, name: 'Other Station' },
            ],
          ],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRainfallStation(789);

      expect(result).toBeNull();
      expect(Logger.prototype.warn).toHaveBeenCalledWith('No rainfall station found for series ID 789');
    });

    it('should handle API error', async () => {
      const apiError = new Error('API Error');
      mockHttpService.axiosRef.get.mockRejectedValue(apiError);

      await expect(service.fetchRainfallStation(789)).rejects.toThrow('API Error');
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Error fetching rainfall station:', apiError);
    });

    it('should handle empty data array', async () => {
      const mockApiResponse = {
        data: {
          data: [[]],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRainfallStation(789);

      expect(result).toBeNull();
    });
  });

  describe('fetchRiverStation', () => {
    it('should fetch river station successfully', async () => {
      const mockApiResponse = {
        data: {
          data: [
            mockRiverStationItem,
            { series_id: 999, name: 'Other River Station' },
          ],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRiverStation(123);

      expect(result).toEqual(mockRiverStationItem);
      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith(
        expect.stringContaining('getRiverWatchFilter'),
        { httpsAgent: expect.any(Object) },
      );
    });

    it('should return null when station not found', async () => {
      const mockApiResponse = {
        data: {
          data: [
            { series_id: 999, name: 'Other River Station' },
          ],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRiverStation(123);

      expect(result).toBeNull();
      expect(Logger.prototype.warn).toHaveBeenCalledWith('No river station found for series ID 123');
    });

    it('should handle API error gracefully', async () => {
      const apiError = new Error('River API Error');
      mockHttpService.axiosRef.get.mockRejectedValue(apiError);

      const result = await service.fetchRiverStation(123);

      expect(result).toBeNull();
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Error fetching river station:', apiError);
    });

    it('should handle empty data array', async () => {
      const mockApiResponse = {
        data: {
          data: [],
        },
      };

      mockHttpService.axiosRef.get.mockResolvedValue(mockApiResponse);

      const result = await service.fetchRiverStation(123);

      expect(result).toBeNull();
    });
  });
});
