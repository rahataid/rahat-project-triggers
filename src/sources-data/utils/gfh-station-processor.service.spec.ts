import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import {
  GfhStationProcessorService,
  GfhStationConfig,
  GfhStationTask,
} from './gfh-station-processor.service';
import { GfhService } from '../gfh.service';
import { SourcesDataService } from '../sources-data.service';
import { Gauge, StationLoacationDetails } from 'src/types/data-source';
import { HealthError } from './health-utils.service';

// Mock the common functions
jest.mock('src/common', () => ({
  getFormattedDate: jest.fn(),
}));

describe('GfhStationProcessorService', () => {
  let service: GfhStationProcessorService;
  let gfhService: GfhService;
  let sourceService: SourcesDataService;
  let getFormattedDateMock: jest.Mock;

  const mockGfhService = {
    fetchAllGauges: jest.fn(),
    matchStationToGauge: jest.fn(),
    processGaugeData: jest.fn(),
    buildFinalOutput: jest.fn(),
    formateGfhStationData: jest.fn(),
    saveDataInGfh: jest.fn(),
  };

  const mockSourceService = {
    findGfhData: jest.fn(),
  };

  const mockStationDetails: StationLoacationDetails = {
    STATION_NAME: 'Test Station',
    RIVER_GAUGE_ID: 'test-gauge-123',
    RIVER_NAME: 'Test River',
    STATION_ID: 'STATION_123',
    POINT_ID: 'POINT_123',
    LISFLOOD_DRAINAGE_AREA: 1000,
    'LISFLOOD_X_(DEG)': 80.123,
    'LISFLOOD_Y_[DEG]': 28.456,
    LATITUDE: 28.456,
    LONGITUDE: 80.123,
  };

  const mockGfhStationConfig: GfhStationConfig = {
    RIVER_BASIN: 'Test River Basin',
    STATION_LOCATIONS_DETAILS: [mockStationDetails],
  };

  const mockGauge: Gauge = {
    gaugeId: 'test-gauge-123',
    location: {
      latitude: 28.456,
      longitude: 80.123,
    },
    source: 'test-source',
    qualityVerified: true,
    name: 'Test Gauge',
    country: 'Test Country',
  };

  const mockTask: GfhStationTask = {
    riverBasin: 'Test River Basin',
    stationDetails: mockStationDetails,
    dateString: '2023-01-01',
  };

  const mockStationGaugeMapping = new Map([
    ['STATION_123', { gauge_id: 'test-gauge-123', distance_km: 0.5 }],
  ]);

  const mockGaugeDataCache = {
    'test-gauge-123': {
      latest_forecast: {
        forecastRanges: [
          {
            start: '2023-01-01',
            end: '2023-01-02',
            forecast: {
              probability: { rp2: 0.3, rp5: 0.1, rp20: 0.0 },
              quality_verified: true,
              severity: 'WARNING',
              trend: 'RISING',
            },
          },
        ],
      },
      model_metadata: {
        model_run_date: '2023-01-01T00:00:00Z',
        model_version: '1.0',
      },
    },
  };

  const mockFinalOutput = {
    STATION_123: {
      gaugeId: 'test-gauge-123',
      distance_km: 0.5,
      source: 'test-source',
      gaugeLocation: {
        latitude: 28.456,
        longitude: 80.123,
      },
      qualityVerified: true,
      model_metadata: mockGaugeDataCache['test-gauge-123'].model_metadata,
      issuedTime: '2023-01-01T00:00:00Z',
      forecastTimeRange: { start: '2023-01-01', end: '2023-01-02' },
      forecastTrend: 'RISING',
      severity: 'WARNING',
      forecasts:
        mockGaugeDataCache['test-gauge-123'].latest_forecast.forecastRanges,
    },
  };

  const mockFormattedGfhData = {
    riverBasin: 'Test River Basin',
    forecastDate: '2023-01-01',
    source: 'HYBAS',
    latitude: '28.456',
    longitude: '80.123',
    stationName: 'Test Station',
    warningLevel: '47.362',
    dangerLevel: '66.398',
    extremeDangerLevel: '93.634',
    basinSize: 1000,
    riverGaugeId: 'test-gauge-123',
    history: [{ value: '19.5', datetime: '2023-01-01T00:00:00Z' }],
  };

  beforeEach(async () => {
    // Import and mock functions
    getFormattedDateMock = require('src/common').getFormattedDate;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GfhStationProcessorService,
        {
          provide: GfhService,
          useValue: mockGfhService,
        },
        {
          provide: SourcesDataService,
          useValue: mockSourceService,
        },
      ],
    }).compile();

    service = module.get<GfhStationProcessorService>(
      GfhStationProcessorService,
    );
    gfhService = module.get<GfhService>(GfhService);
    sourceService = module.get<SourcesDataService>(SourcesDataService);

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock Date methods
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2023-01-01T10:05:00.000Z');

    // Default mock implementations
    getFormattedDateMock.mockReturnValue({
      dateString: '2023-01-01',
      dateTimeString: '2023-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processGfhStation', () => {
    let errors: HealthError[];
    const uniqueGaugeIds = new Set(['test-gauge-123']);

    beforeEach(() => {
      errors = [];
    });

    it('should process GFH station successfully', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockReturnValue(
        mockFormattedGfhData,
      );
      mockGfhService.saveDataInGfh.mockResolvedValue({
        id: 1,
        type: SourceType.WATER_LEVEL,
        info: mockFormattedGfhData,
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);

      // Verify data existence check
      expect(mockSourceService.findGfhData).toHaveBeenCalledWith(
        'Test River Basin',
        '2023-01-01',
        'Test Station',
      );

      // Verify station to gauge matching
      expect(mockGfhService.matchStationToGauge).toHaveBeenCalledWith(
        [mockGauge],
        mockStationDetails,
      );

      // Verify gauge data processing
      expect(mockGfhService.processGaugeData).toHaveBeenCalledWith(
        uniqueGaugeIds,
      );

      // Verify final output building
      expect(mockGfhService.buildFinalOutput).toHaveBeenCalledWith(
        mockStationGaugeMapping,
        mockGaugeDataCache,
      );

      // Verify data formatting
      expect(mockGfhService.formateGfhStationData).toHaveBeenCalledWith(
        '2023-01-01',
        mockFinalOutput['STATION_123'],
        'Test Station',
        'Test River Basin',
      );

      // Verify data save
      expect(mockGfhService.saveDataInGfh).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'Test River Basin',
        mockFormattedGfhData,
      );

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Global flood data saved successfully for Test Station',
      );
    });

    it('should return true if data already exists', async () => {
      mockSourceService.findGfhData.mockResolvedValue([
        { id: 1, riverBasin: 'Test River Basin', forecastDate: '2023-01-01' },
      ]);

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);
      expect(mockGfhService.matchStationToGauge).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Global flood data for Test Station on 2023-01-01 already exists.',
      );
    });

    it('should handle no data found in final output', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue({});

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_NO_DATA',
        message: 'No data found for station Test Station',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'No data found for station Test Station',
      );
      expect(mockGfhService.formateGfhStationData).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should handle empty final output entries', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue({
        STATION_123: null,
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GFH_NO_DATA');
    });

    it('should handle save failure', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockReturnValue(
        mockFormattedGfhData,
      );
      mockGfhService.saveDataInGfh.mockResolvedValue(null);

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_SAVE_ERROR',
        message: 'Failed to save data for station Test Station',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Failed to save Global flood data for Test Station',
      );
    });

    it('should handle save returning false', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockReturnValue(
        mockFormattedGfhData,
      );
      mockGfhService.saveDataInGfh.mockResolvedValue(false);

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GFH_SAVE_ERROR');
    });

    it('should handle errors during data existence check', async () => {
      mockSourceService.findGfhData.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_STATION_ERROR',
        message: 'Error processing station Test Station: Database error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error processing station Test Station:',
        'Database error',
      );
    });

    it('should handle errors during gauge matching', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockImplementation(() => {
        throw new Error('Gauge matching error');
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_STATION_ERROR',
        message: 'Error processing station Test Station: Gauge matching error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle errors during gauge data processing', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockRejectedValue(
        new Error('Gauge data error'),
      );

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_STATION_ERROR',
        message: 'Error processing station Test Station: Gauge data error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle errors during final output building', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockImplementation(() => {
        throw new Error('Output building error');
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Output building error');
    });

    it('should handle errors during data formatting', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockImplementation(() => {
        throw new Error('Formatting error');
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Formatting error');
    });

    it('should handle errors during data save', async () => {
      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockReturnValue(
        mockFormattedGfhData,
      );
      mockGfhService.saveDataInGfh.mockRejectedValue(new Error('Save error'));

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Save error');
    });

    it('should handle error without message property', async () => {
      mockSourceService.findGfhData.mockRejectedValue({
        code: 'SOME_ERROR_CODE',
        status: 500,
      });

      const result = await service.processGfhStation(
        mockTask,
        [mockGauge],
        errors,
      );

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GFH_STATION_ERROR',
        message: 'Error processing station Test Station: Unknown error',
        timestamp: '2023-01-01T10:05:00.000Z',
      });
    });

    it('should handle multiple gauges', async () => {
      const multipleGauges = [
        mockGauge,
        {
          gaugeId: 'test-gauge-456',
          location: {
            latitude: 29.123,
            longitude: 81.456,
          },
          name: 'Another Gauge',
          country: 'Test Country',
        },
      ];

      mockSourceService.findGfhData.mockResolvedValue([]);
      mockGfhService.matchStationToGauge.mockReturnValue([
        mockStationGaugeMapping,
        uniqueGaugeIds,
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue(mockFinalOutput);
      mockGfhService.formateGfhStationData.mockReturnValue(
        mockFormattedGfhData,
      );
      mockGfhService.saveDataInGfh.mockResolvedValue({ id: 1 });

      const result = await service.processGfhStation(
        mockTask,
        multipleGauges,
        errors,
      );

      expect(result).toBe(true);
      expect(mockGfhService.matchStationToGauge).toHaveBeenCalledWith(
        multipleGauges,
        mockStationDetails,
      );
    });
  });

  describe('createGfhTasks', () => {
    it('should create tasks for single config with single station', async () => {
      const configs = [mockGfhStationConfig];
      const tasks = service.createGfhTasks(configs);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual({
        riverBasin: 'Test River Basin',
        stationDetails: mockStationDetails,
        dateString: '2023-01-01',
      });
      expect(getFormattedDateMock).toHaveBeenCalled();
    });

    it('should create tasks for single config with multiple stations', async () => {
      const stationDetails2: StationLoacationDetails = {
        STATION_NAME: 'Second Station',
        RIVER_GAUGE_ID: 'test-gauge-456',
        RIVER_NAME: 'Test River',
        STATION_ID: 'STATION_456',
        POINT_ID: 'POINT_456',
        LISFLOOD_DRAINAGE_AREA: 2000,
        'LISFLOOD_X_(DEG)': 81.123,
        'LISFLOOD_Y_[DEG]': 29.456,
        LATITUDE: 29.456,
        LONGITUDE: 81.123,
      };

      const configWithMultipleStations: GfhStationConfig = {
        RIVER_BASIN: 'Test River Basin',
        STATION_LOCATIONS_DETAILS: [mockStationDetails, stationDetails2],
      };

      const tasks = service.createGfhTasks([configWithMultipleStations]);

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({
        riverBasin: 'Test River Basin',
        stationDetails: mockStationDetails,
        dateString: '2023-01-01',
      });
      expect(tasks[1]).toEqual({
        riverBasin: 'Test River Basin',
        stationDetails: stationDetails2,
        dateString: '2023-01-01',
      });
    });

    it('should create tasks for multiple configs', async () => {
      const config2: GfhStationConfig = {
        RIVER_BASIN: 'Another River Basin',
        STATION_LOCATIONS_DETAILS: [
          {
            STATION_NAME: 'Another Station',
            RIVER_GAUGE_ID: 'another-gauge-789',
            RIVER_NAME: 'Another River',
            STATION_ID: 'STATION_789',
            POINT_ID: 'POINT_789',
            LISFLOOD_DRAINAGE_AREA: 3000,
            'LISFLOOD_X_(DEG)': 82.123,
            'LISFLOOD_Y_[DEG]': 30.456,
            LATITUDE: 30.456,
            LONGITUDE: 82.123,
          },
        ],
      };

      const tasks = service.createGfhTasks([mockGfhStationConfig, config2]);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].riverBasin).toBe('Test River Basin');
      expect(tasks[1].riverBasin).toBe('Another River Basin');
      expect(tasks[1].stationDetails.STATION_NAME).toBe('Another Station');
    });

    it('should handle empty configs array', async () => {
      const tasks = service.createGfhTasks([]);
      expect(tasks).toHaveLength(0);
    });

    it('should handle config with empty STATION_LOCATIONS_DETAILS array', async () => {
      const configWithEmptyStations: GfhStationConfig = {
        RIVER_BASIN: 'Empty Basin',
        STATION_LOCATIONS_DETAILS: [],
      };

      const tasks = service.createGfhTasks([configWithEmptyStations]);
      expect(tasks).toHaveLength(0);
    });

    it('should use the same date string for all tasks', async () => {
      getFormattedDateMock.mockReturnValue({
        dateString: '2023-12-25',
        dateTimeString: '2023-12-25T12:00:00Z',
      });

      const stationDetails2: StationLoacationDetails = {
        ...mockStationDetails,
        STATION_NAME: 'Second Station',
        STATION_ID: 'STATION_456',
      };

      const configWithMultipleStations: GfhStationConfig = {
        RIVER_BASIN: 'Test River Basin',
        STATION_LOCATIONS_DETAILS: [mockStationDetails, stationDetails2],
      };

      const tasks = service.createGfhTasks([configWithMultipleStations]);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].dateString).toBe('2023-12-25');
      expect(tasks[1].dateString).toBe('2023-12-25');
      expect(getFormattedDateMock).toHaveBeenCalledTimes(1); // Should be called only once
    });
  });

  describe('fetchGauges', () => {
    it('should fetch gauges successfully', async () => {
      const mockGauges = [mockGauge];
      mockGfhService.fetchAllGauges.mockResolvedValue(mockGauges);

      const result = await service.fetchGauges();

      expect(result).toEqual(mockGauges);
      expect(mockGfhService.fetchAllGauges).toHaveBeenCalled();
    });

    it('should throw error when no gauges found', async () => {
      mockGfhService.fetchAllGauges.mockResolvedValue([]);

      await expect(service.fetchGauges()).rejects.toThrow('No gauges found');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error fetching gauges:',
        'No gauges found',
      );
    });

    it('should handle fetch error', async () => {
      const fetchError = new Error('API fetch error');
      mockGfhService.fetchAllGauges.mockRejectedValue(fetchError);

      await expect(service.fetchGauges()).rejects.toThrow('API fetch error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error fetching gauges:',
        'API fetch error',
      );
    });

    it('should return multiple gauges', async () => {
      const multipleGauges = [
        mockGauge,
        {
          gaugeId: 'test-gauge-456',
          location: {
            latitude: 29.123,
            longitude: 81.456,
          },
          name: 'Another Gauge',
          country: 'Test Country',
        },
        {
          gaugeId: 'test-gauge-789',
          location: {
            latitude: 30.123,
            longitude: 82.456,
          },
          name: 'Third Gauge',
          country: 'Another Country',
        },
      ];

      mockGfhService.fetchAllGauges.mockResolvedValue(multipleGauges);

      const result = await service.fetchGauges();

      expect(result).toEqual(multipleGauges);
      expect(result).toHaveLength(3);
    });

    it('should handle error without message property', async () => {
      const errorWithoutMessage = { code: 'FETCH_ERROR', status: 500 };
      mockGfhService.fetchAllGauges.mockRejectedValue(errorWithoutMessage);

      await expect(service.fetchGauges()).rejects.toEqual(errorWithoutMessage);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error fetching gauges:',
        undefined,
      );
    });
  });
});
