import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from '@lib/database';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { HealthCacheService } from 'src/source/health-cache.service';
import { HealthUtilsService } from './utils/health-utils.service';
import { DhmStationProcessorService } from './utils/dhm-station-processor.service';
import { GlofasStationProcessorService } from './utils/glofas-station-processor.service';
import { GfhStationProcessorService } from './utils/gfh-station-processor.service';
import { SettingsService } from '@lib/core';
import { DataSourceValue } from 'src/types/settings';

jest.mock('@lib/database', () => ({
  SettingsService: {
    get: jest.fn(),
  },
}));

describe('ScheduleSourcesDataService', () => {
  let service: ScheduleSourcesDataService;
  let healthCacheService: HealthCacheService;
  let healthUtilsService: HealthUtilsService;
  let dhmStationProcessor: DhmStationProcessorService;
  let glofasStationProcessor: GlofasStationProcessorService;
  let gfhStationProcessor: GfhStationProcessorService;

  const mockHealthCacheService = {
    createHealthData: jest.fn(),
    setSourceHealth: jest.fn(),
    setSourceConfig: jest.fn(),
  };

  const mockHealthUtilsService = {
    validateSettings: jest.fn(),
    processStationsInParallel: jest.fn(),
    storeHealthResult: jest.fn(),
    handleTopLevelError: jest.fn(),
  };

  const mockDhmStationProcessor = {
    createWaterLevelTasks: jest.fn(),
    createRainfallTasks: jest.fn(),
    processWaterLevelStation: jest.fn(),
    processRainfallStation: jest.fn(),
  };

  const mockGlofasStationProcessor = {
    createGlofasTasks: jest.fn(),
    processGlofasStation: jest.fn(),
  };

  const mockGfhStationProcessor = {
    createGfhTasks: jest.fn(),
    processGfhStation: jest.fn(),
    fetchGauges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleSourcesDataService,
        {
          provide: HealthCacheService,
          useValue: mockHealthCacheService,
        },
        {
          provide: HealthUtilsService,
          useValue: mockHealthUtilsService,
        },
        {
          provide: DhmStationProcessorService,
          useValue: mockDhmStationProcessor,
        },
        {
          provide: GlofasStationProcessorService,
          useValue: mockGlofasStationProcessor,
        },
        {
          provide: GfhStationProcessorService,
          useValue: mockGfhStationProcessor,
        },
      ],
    }).compile();

    service = module.get<ScheduleSourcesDataService>(
      ScheduleSourcesDataService,
    );
    healthCacheService = module.get<HealthCacheService>(HealthCacheService);
    healthUtilsService = module.get<HealthUtilsService>(HealthUtilsService);
    dhmStationProcessor = module.get<DhmStationProcessorService>(
      DhmStationProcessorService,
    );
    glofasStationProcessor = module.get<GlofasStationProcessorService>(
      GlofasStationProcessorService,
    );
    gfhStationProcessor = module.get<GfhStationProcessorService>(
      GfhStationProcessorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    beforeEach(() => {
      jest.spyOn(service, 'syncRiverWaterData').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncRainfallData').mockResolvedValue(undefined);
      jest.spyOn(service, 'synchronizeGlofas').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncGlobalFloodHub').mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'initializeSourceConfigs')
        .mockResolvedValue(undefined);
    });

    it('should call all sync methods and initialize source configs on bootstrap', () => {
      service.onApplicationBootstrap();

      expect(service.syncRiverWaterData).toHaveBeenCalled();
      expect(service.syncRainfallData).toHaveBeenCalled();
      expect(service.synchronizeGlofas).toHaveBeenCalled();
      expect(service.syncGlobalFloodHub).toHaveBeenCalled();
      expect(service['initializeSourceConfigs']).toHaveBeenCalled();
    });
  });

  describe('syncRiverWaterData', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [
        {
          WATER_LEVEL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29089],
          },
          RAINFALL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29785, 29608],
          },
        },
      ],
      GLOFAS: [],
      GFH: [],
    };

    const mockTasks = [
      {
        config: {
          WATER_LEVEL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29089],
          },
        },
        seriesId: 29089,
      },
    ];

    const mockResult = {
      status: 'UP' as const,
      successfulStations: 1,
      totalStations: 1,
      errors: [],
      duration: 1000,
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockHealthUtilsService.validateSettings.mockResolvedValue(true);
      mockDhmStationProcessor.createWaterLevelTasks.mockReturnValue(mockTasks);
      mockHealthUtilsService.processStationsInParallel.mockResolvedValue(
        mockResult,
      );
      mockHealthUtilsService.storeHealthResult.mockResolvedValue(undefined);
    });

    it('should sync river water data successfully', async () => {
      await service.syncRiverWaterData();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(mockHealthUtilsService.validateSettings).toHaveBeenCalledWith(
        mockDataSource[DataSource.DHM],
        expect.objectContaining({
          sourceId: 'DHM:WATER-LEVEL',
          name: 'DHM Water Level API',
        }),
        'DHM',
      );
      expect(
        mockDhmStationProcessor.createWaterLevelTasks,
      ).toHaveBeenCalledWith(mockDataSource[DataSource.DHM]);
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'DHM:WATER-LEVEL',
          name: 'DHM Water Level API',
        }),
        mockResult,
      );
    });

    it('should call processWaterLevelStation with correct parameters', async () => {
      // Mock the processor to capture the callback
      let capturedCallback: any;
      mockHealthUtilsService.processStationsInParallel.mockImplementation(
        async (tasks, callback) => {
          capturedCallback = callback;
          return mockResult;
        },
      );

      await service.syncRiverWaterData();

      // Execute the captured callback to test the arrow function
      const mockTask = mockTasks[0];
      const mockErrors: any[] = [];
      await capturedCallback(mockTask, mockErrors);

      expect(
        mockDhmStationProcessor.processWaterLevelStation,
      ).toHaveBeenCalledWith(mockTask.config, mockTask.seriesId, mockErrors);
    });

    it('should return early if settings validation fails', async () => {
      mockHealthUtilsService.validateSettings.mockResolvedValue(false);

      await service.syncRiverWaterData();

      expect(
        mockDhmStationProcessor.createWaterLevelTasks,
      ).not.toHaveBeenCalled();
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).not.toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).not.toHaveBeenCalled();
    });

    it('should handle errors and call handleTopLevelError', async () => {
      const error = new Error('Test error');
      mockHealthUtilsService.validateSettings.mockRejectedValue(error);

      await service.syncRiverWaterData();

      expect(mockHealthUtilsService.handleTopLevelError).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'DHM:WATER-LEVEL',
          name: 'DHM Water Level API',
        }),
        error,
        'DHM_WATER_SYNC_ERROR',
      );
    });
  });

  describe('syncRainfallData', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [
        {
          WATER_LEVEL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29089],
          },
          RAINFALL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29785, 29608],
          },
        },
      ],
      GLOFAS: [],
      GFH: [],
    };

    const mockTasks = [
      {
        config: {
          RAINFALL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29785, 29608],
          },
        },
        seriesId: 29785,
      },
    ];

    const mockResult = {
      status: 'UP' as const,
      successfulStations: 1,
      totalStations: 1,
      errors: [],
      duration: 1000,
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockHealthUtilsService.validateSettings.mockResolvedValue(true);
      mockDhmStationProcessor.createRainfallTasks.mockReturnValue(mockTasks);
      mockHealthUtilsService.processStationsInParallel.mockResolvedValue(
        mockResult,
      );
      mockHealthUtilsService.storeHealthResult.mockResolvedValue(undefined);
    });

    it('should sync rainfall data successfully', async () => {
      await service.syncRainfallData();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(mockHealthUtilsService.validateSettings).toHaveBeenCalledWith(
        mockDataSource[DataSource.DHM],
        expect.objectContaining({
          sourceId: 'DHM:RAINFALL',
          name: 'DHM Rainfall API',
        }),
        'DHM',
      );
      expect(mockDhmStationProcessor.createRainfallTasks).toHaveBeenCalledWith(
        mockDataSource[DataSource.DHM],
      );
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'DHM:RAINFALL',
          name: 'DHM Rainfall API',
        }),
        mockResult,
      );
    });

    it('should call processRainfallStation with correct parameters', async () => {
      // Mock the processor to capture the callback
      let capturedCallback: any;
      mockHealthUtilsService.processStationsInParallel.mockImplementation(
        async (tasks, callback) => {
          capturedCallback = callback;
          return mockResult;
        },
      );

      await service.syncRainfallData();

      // Execute the captured callback to test the arrow function
      const mockTask = mockTasks[0];
      const mockErrors: any[] = [];
      await capturedCallback(mockTask, mockErrors);

      expect(
        mockDhmStationProcessor.processRainfallStation,
      ).toHaveBeenCalledWith(mockTask.config, mockTask.seriesId, mockErrors);
    });

    it('should return early if settings validation fails', async () => {
      mockHealthUtilsService.validateSettings.mockResolvedValue(false);

      await service.syncRainfallData();

      expect(
        mockDhmStationProcessor.createRainfallTasks,
      ).not.toHaveBeenCalled();
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).not.toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).not.toHaveBeenCalled();
    });

    it('should handle errors and call handleTopLevelError', async () => {
      const error = new Error('Test error');
      mockHealthUtilsService.validateSettings.mockRejectedValue(error);

      await service.syncRainfallData();

      expect(mockHealthUtilsService.handleTopLevelError).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'DHM:RAINFALL',
          name: 'DHM Rainfall API',
        }),
        error,
        'DHM_RAINFALL_SYNC_ERROR',
      );
    });
  });

  describe('synchronizeGlofas', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [],
      GLOFAS: [
        {
          LOCATION: 'Doda river at East-West Highway',
          URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
          I: '227',
          J: '67',
          TIMESTRING: '2023-10-01T00:00:00Z',
        },
      ],
      GFH: [],
    };

    const mockTasks = [
      {
        LOCATION: 'Doda river at East-West Highway',
        URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
        BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
        I: '227',
        J: '67',
        TIMESTRING: '2023-10-01T00:00:00Z',
      },
    ];

    const mockResult = {
      status: 'UP' as const,
      successfulStations: 1,
      totalStations: 1,
      errors: [],
      duration: 1000,
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockHealthUtilsService.validateSettings.mockResolvedValue(true);
      mockGlofasStationProcessor.createGlofasTasks.mockReturnValue(mockTasks);
      mockHealthUtilsService.processStationsInParallel.mockResolvedValue(
        mockResult,
      );
      mockHealthUtilsService.storeHealthResult.mockResolvedValue(undefined);
    });

    it('should synchronize Glofas data successfully', async () => {
      await service.synchronizeGlofas();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(mockHealthUtilsService.validateSettings).toHaveBeenCalledWith(
        mockDataSource[DataSource.GLOFAS],
        expect.objectContaining({
          sourceId: 'GLOFAS',
          name: 'Glofas API',
        }),
        'GLOFAS',
      );
      expect(mockGlofasStationProcessor.createGlofasTasks).toHaveBeenCalledWith(
        mockDataSource[DataSource.GLOFAS],
      );
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'GLOFAS',
          name: 'Glofas API',
        }),
        mockResult,
      );
    });

    it('should call processGlofasStation with correct parameters', async () => {
      // Mock the processor to capture the callback
      let capturedCallback: any;
      mockHealthUtilsService.processStationsInParallel.mockImplementation(
        async (tasks, callback) => {
          capturedCallback = callback;
          return mockResult;
        },
      );

      await service.synchronizeGlofas();

      // Execute the captured callback to test the arrow function
      const mockGlofasStation = mockTasks[0];
      const mockErrors: any[] = [];
      await capturedCallback(mockGlofasStation, mockErrors);

      expect(
        mockGlofasStationProcessor.processGlofasStation,
      ).toHaveBeenCalledWith(mockGlofasStation, mockErrors);
    });

    it('should return early if settings validation fails', async () => {
      mockHealthUtilsService.validateSettings.mockResolvedValue(false);

      await service.synchronizeGlofas();

      expect(
        mockGlofasStationProcessor.createGlofasTasks,
      ).not.toHaveBeenCalled();
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).not.toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).not.toHaveBeenCalled();
    });

    it('should handle errors and call handleTopLevelError', async () => {
      const error = new Error('Test error');
      mockHealthUtilsService.validateSettings.mockRejectedValue(error);

      await service.synchronizeGlofas();

      expect(mockHealthUtilsService.handleTopLevelError).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'GLOFAS',
          name: 'Glofas API',
        }),
        error,
        'GLOFAS_SYNC_ERROR',
      );
    });
  });

  describe('syncGlobalFloodHub', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [],
      GLOFAS: [],
      GFH: [
        {
          RIVER_BASIN: 'Test River Basin',
          STATION_LOCATIONS_DETAILS: [
            {
              STATION_NAME: 'Test Station',
              RIVER_GAUGE_ID: 'test-gauge-id',
              RIVER_NAME: 'test-river',
              STATION_ID: 'test-station-id',
              POINT_ID: 'test-point-id',
              LISFLOOD_DRAINAGE_AREA: 100,
              'LISFLOOD_X_(DEG)': 80.123,
              'LISFLOOD_Y_[DEG]': 28.456,
              LATITUDE: 28.456,
              LONGITUDE: 80.123,
            },
          ],
        },
      ],
    };

    const mockGauges = [
      {
        gauge_id: 'test-gauge-id',
        latitude: 28.456,
        longitude: 80.123,
      },
    ];

    const mockTasks = [
      {
        riverBasin: 'Test River Basin',
        stationDetails: {
          STATION_NAME: 'Test Station',
          RIVER_GAUGE_ID: 'test-gauge-id',
          RIVER_NAME: 'test-river',
          STATION_ID: 'test-station-id',
          POINT_ID: 'test-point-id',
          LISFLOOD_DRAINAGE_AREA: 100,
          'LISFLOOD_X_(DEG)': 80.123,
          'LISFLOOD_Y_[DEG]': 28.456,
          LATITUDE: 28.456,
          LONGITUDE: 80.123,
        },
        dateString: '2023-01-01',
      },
    ];

    const mockResult = {
      status: 'UP' as const,
      successfulStations: 1,
      totalStations: 1,
      errors: [],
      duration: 1000,
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockHealthUtilsService.validateSettings.mockResolvedValue(true);
      mockGfhStationProcessor.fetchGauges.mockResolvedValue(mockGauges);
      mockGfhStationProcessor.createGfhTasks.mockReturnValue(mockTasks);
      mockHealthUtilsService.processStationsInParallel.mockResolvedValue(
        mockResult,
      );
      mockHealthUtilsService.storeHealthResult.mockResolvedValue(undefined);
    });

    it('should sync global flood hub data successfully', async () => {
      await service.syncGlobalFloodHub();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(mockHealthUtilsService.validateSettings).toHaveBeenCalledWith(
        mockDataSource[DataSource.GFH],
        expect.objectContaining({
          sourceId: 'GFH',
          name: 'GFH API',
        }),
        'GFH',
      );
      expect(mockGfhStationProcessor.fetchGauges).toHaveBeenCalled();
      expect(mockGfhStationProcessor.createGfhTasks).toHaveBeenCalledWith(
        mockDataSource[DataSource.GFH],
      );
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'GFH',
          name: 'GFH API',
        }),
        mockResult,
      );
    });

    it('should call processGfhStation with correct parameters', async () => {
      // Mock the processor to capture the callback
      let capturedCallback: any;
      mockHealthUtilsService.processStationsInParallel.mockImplementation(
        async (tasks, callback) => {
          capturedCallback = callback;
          return mockResult;
        },
      );

      await service.syncGlobalFloodHub();

      // Execute the captured callback to test the arrow function
      const mockTask = mockTasks[0];
      const mockErrors: any[] = [];
      await capturedCallback(mockTask, mockErrors);

      expect(mockGfhStationProcessor.processGfhStation).toHaveBeenCalledWith(
        mockTask,
        mockGauges,
        mockErrors,
      );
    });

    it('should return early if settings validation fails', async () => {
      mockHealthUtilsService.validateSettings.mockResolvedValue(false);

      await service.syncGlobalFloodHub();

      expect(mockGfhStationProcessor.fetchGauges).not.toHaveBeenCalled();
      expect(mockGfhStationProcessor.createGfhTasks).not.toHaveBeenCalled();
      expect(
        mockHealthUtilsService.processStationsInParallel,
      ).not.toHaveBeenCalled();
      expect(mockHealthUtilsService.storeHealthResult).not.toHaveBeenCalled();
    });

    it('should handle errors and call handleTopLevelError', async () => {
      const error = new Error('Test error');
      mockHealthUtilsService.validateSettings.mockRejectedValue(error);

      await service.syncGlobalFloodHub();

      expect(mockHealthUtilsService.handleTopLevelError).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'GFH',
          name: 'GFH API',
        }),
        error,
        'GFH_SYNC_ERROR',
      );
    });

    it('should handle fetch gauges error', async () => {
      const error = new Error('No gauges found');
      mockGfhStationProcessor.fetchGauges.mockRejectedValue(error);

      await service.syncGlobalFloodHub();

      expect(mockHealthUtilsService.handleTopLevelError).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'GFH',
          name: 'GFH API',
        }),
        error,
        'GFH_SYNC_ERROR',
      );
    });
  });

  describe('initializeSourceConfigs', () => {
    it('should initialize source configurations', async () => {
      await service['initializeSourceConfigs']();

      expect(mockHealthCacheService.setSourceConfig).toHaveBeenCalledTimes(4);
      expect(mockHealthCacheService.setSourceConfig).toHaveBeenCalledWith({
        source_id: 'DHM:WATER-LEVEL',
        name: 'DHM Water Level API',
        fetch_interval_minutes: 15,
        stale_threshold_multiplier: 1.5,
      });
      expect(mockHealthCacheService.setSourceConfig).toHaveBeenCalledWith({
        source_id: 'DHM:RAINFALL',
        name: 'DHM Rainfall API',
        fetch_interval_minutes: 15,
        stale_threshold_multiplier: 1.5,
      });
      expect(mockHealthCacheService.setSourceConfig).toHaveBeenCalledWith({
        source_id: 'GLOFAS',
        name: 'Glofas API',
        fetch_interval_minutes: 60,
        stale_threshold_multiplier: 1.1,
      });
      expect(mockHealthCacheService.setSourceConfig).toHaveBeenCalledWith({
        source_id: 'GFH',
        name: 'GFH API',
        fetch_interval_minutes: 1440,
        stale_threshold_multiplier: 1.1,
      });
    });
  });
});
