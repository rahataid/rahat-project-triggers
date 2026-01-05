import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import { RpcException } from '@nestjs/microservices';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import {
  DhmWaterLevelAdapter,
  DhmRainfallAdapter,
  DhmService,
  DhmObservation,
  RiverStationItem,
  DhmSourceDataTypeEnum,
} from '@lib/dhm-adapter';
import { GlofasAdapter, GlofasServices } from '@lib/glofas-adapter';
import { GfhAdapter, GfhService } from '@lib/gfh-adapter';
import {
  Indicator,
  HealthMonitoringService,
  HealthCacheService,
} from '@lib/core';
import { SourceType } from '@lib/database';
import { SourceDataType } from './dto/get-source-data';

jest.mock('@lib/core', () => {
  const actual = jest.requireActual('@lib/core');
  const mockIsErr = jest.fn();
  (globalThis as any).__mockIsErr = mockIsErr;
  return {
    ...actual,
    isErr: mockIsErr,
  };
});

const getMockIsErr = () => (globalThis as any).__mockIsErr as jest.Mock;

describe('ScheduleSourcesDataService', () => {
  let service: ScheduleSourcesDataService;

  const mockHealthCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    setAdapterConfig: jest.fn(),
  };

  const mockDhmWaterLevelAdapter = {
    execute: jest.fn(),
    executeByPeriod: jest.fn(),
    getAdapterId: jest.fn().mockReturnValue('dhm-water-level'),
    setHealthService: jest.fn(),
  };

  const mockDhmRainfallAdapter = {
    execute: jest.fn(),
    getAdapterId: jest.fn().mockReturnValue('dhm-rainfall'),
    setHealthService: jest.fn(),
  };

  const mockGlofasAdapter = {
    execute: jest.fn(),
    getAdapterId: jest.fn().mockReturnValue('glofas'),
    setHealthService: jest.fn(),
  };

  const mockGfhAdapter = {
    execute: jest.fn(),
    getAdapterId: jest.fn().mockReturnValue('gfh'),
    setHealthService: jest.fn(),
  };

  const mockDhmService = {
    saveDataInDhm: jest.fn(),
  };

  const mockGlofasServices = {
    saveDataInGlofas: jest.fn(),
  };

  const mockGfhService = {
    saveDataInGfh: jest.fn(),
  };

  const mockHealthMonitoringService = {
    setCacheService: jest.fn(),
    recordExecution: jest.fn(),
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
          provide: DhmWaterLevelAdapter,
          useValue: mockDhmWaterLevelAdapter,
        },
        {
          provide: DhmRainfallAdapter,
          useValue: mockDhmRainfallAdapter,
        },
        {
          provide: GlofasAdapter,
          useValue: mockGlofasAdapter,
        },
        {
          provide: GfhAdapter,
          useValue: mockGfhAdapter,
        },
        {
          provide: DhmService,
          useValue: mockDhmService,
        },
        {
          provide: GlofasServices,
          useValue: mockGlofasServices,
        },
        {
          provide: GfhService,
          useValue: mockGfhService,
        },
        {
          provide: HealthMonitoringService,
          useValue: mockHealthMonitoringService,
        },
      ],
    }).compile();

    service = module.get<ScheduleSourcesDataService>(
      ScheduleSourcesDataService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should set cache service and configure adapters', () => {
      const setCacheServiceSpy = jest.spyOn(
        HealthMonitoringService,
        'setCacheService',
      );

      service.onModuleInit();

      expect(setCacheServiceSpy).toHaveBeenCalledWith(mockHealthCacheService);

      expect(mockDhmWaterLevelAdapter.setHealthService).toHaveBeenCalledWith(
        mockHealthMonitoringService,
      );
      expect(mockDhmRainfallAdapter.setHealthService).toHaveBeenCalledWith(
        mockHealthMonitoringService,
      );
      expect(mockGlofasAdapter.setHealthService).toHaveBeenCalledWith(
        mockHealthMonitoringService,
      );
      expect(mockGfhAdapter.setHealthService).toHaveBeenCalledWith(
        mockHealthMonitoringService,
      );

      setCacheServiceSpy.mockRestore();
    });
  });

  describe('onApplicationBootstrap', () => {
    beforeEach(() => {
      jest.spyOn(service, 'syncRiverWaterData').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncRainfallData').mockResolvedValue(undefined);
      jest.spyOn(service, 'synchronizeGlofas').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncGfhData').mockResolvedValue(undefined);
    });

    it('should call all sync methods on bootstrap', async () => {
      await service.onApplicationBootstrap();

      expect(service.syncRiverWaterData).toHaveBeenCalledTimes(1);
      expect(service.syncRainfallData).toHaveBeenCalledTimes(1);
      expect(service.synchronizeGlofas).toHaveBeenCalledTimes(1);
      expect(service.syncGfhData).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncRiverWaterData', () => {
    const mockIndicators: Indicator[] = [
      {
        kind: 'OBSERVATION',
        indicator: 'water_level_m',
        value: 10,
        units: 'm',
        issuedAt: new Date().toISOString(),
        location: { type: 'BASIN', basinId: 'test-basin-id' },
        source: { key: 'dhm' },
        info: { test: 'data' },
      },
    ];

    it('should save data when execution is successful', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['dhmWaterMonitored'], 'execute')
        .mockResolvedValue({ data: mockIndicators } as any);

      await service.syncRiverWaterData();

      expect(mockDhmService.saveDataInDhm).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'test-basin-id',
        mockIndicators[0].info,
      );
    });

    it('should handle error when execution fails with non-AxiosError', async () => {
      const error = new Error('Generic error');
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['dhmWaterMonitored'], 'execute')
        .mockResolvedValue({ details: error } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncRiverWaterData();

      expect(loggerSpy).toHaveBeenCalledWith(error);
      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });

    it('should handle error when execution fails with AxiosError', async () => {
      const axiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Not found' },
          config: { url: 'test-url' },
        },
      } as AxiosError;
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['dhmWaterMonitored'], 'execute')
        .mockResolvedValue({ details: axiosError } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncRiverWaterData();

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(axiosError);
      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });

    it('should handle multiple indicators', async () => {
      const multipleIndicators: Indicator[] = [
        {
          kind: 'OBSERVATION',
          indicator: 'water_level_m',
          value: 10,
          units: 'm',
          issuedAt: new Date().toISOString(),
          location: { type: 'BASIN', basinId: 'basin-1' },
          source: { key: 'dhm' },
          info: { data: '1' },
        },
        {
          kind: 'OBSERVATION',
          indicator: 'water_level_m',
          value: 20,
          units: 'm',
          issuedAt: new Date().toISOString(),
          location: { type: 'BASIN', basinId: 'basin-2' },
          source: { key: 'dhm' },
          info: { data: '2' },
        },
      ];

      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['dhmWaterMonitored'], 'execute')
        .mockResolvedValue({ data: multipleIndicators } as any);

      await service.syncRiverWaterData();

      expect(mockDhmService.saveDataInDhm).toHaveBeenCalledTimes(2);
      expect(mockDhmService.saveDataInDhm).toHaveBeenNthCalledWith(
        1,
        SourceType.WATER_LEVEL,
        'basin-1',
        multipleIndicators[0].info,
      );
      expect(mockDhmService.saveDataInDhm).toHaveBeenNthCalledWith(
        2,
        SourceType.WATER_LEVEL,
        'basin-2',
        multipleIndicators[1].info,
      );
    });
  });

  describe('syncRainfallData', () => {
    const mockIndicators: Indicator[] = [
      {
        kind: 'OBSERVATION',
        indicator: 'rainfall_mm',
        value: 10,
        units: 'mm',
        issuedAt: new Date().toISOString(),
        location: { type: 'BASIN', basinId: 'test-basin-id' },
        source: { key: 'dhm' },
        info: { test: 'data' },
      },
    ];

    it('should save data when execution is successful', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['dhmRainfallMonitored'], 'execute')
        .mockResolvedValue({ data: mockIndicators } as any);

      await service.syncRainfallData();

      expect(mockDhmService.saveDataInDhm).toHaveBeenCalledWith(
        SourceType.RAINFALL,
        'test-basin-id',
        mockIndicators[0].info,
      );
    });

    it('should handle error when execution fails with non-AxiosError', async () => {
      const error = new Error('Generic error');
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['dhmRainfallMonitored'], 'execute')
        .mockResolvedValue({ details: error } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncRainfallData();

      expect(loggerSpy).toHaveBeenCalledWith(error);
      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });

    it('should handle error when execution fails with AxiosError', async () => {
      const axiosError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
          config: { url: 'test-url' },
        },
      } as AxiosError;
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['dhmRainfallMonitored'], 'execute')
        .mockResolvedValue({ details: axiosError } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncRainfallData();

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(axiosError);
      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });

    it('should handle empty indicators array', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['dhmRainfallMonitored'], 'execute')
        .mockResolvedValue({ data: [] } as any);

      await service.syncRainfallData();

      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });
  });

  describe('synchronizeGlofas', () => {
    const mockIndicators: Indicator[] = [
      {
        kind: 'FORECAST',
        indicator: 'prob_flood',
        value: 0.5,
        units: 'probability',
        issuedAt: new Date().toISOString(),
        location: { type: 'BASIN', basinId: 'test-basin-id' },
        source: { key: 'glofas' },
        info: { test: 'data' },
      },
    ];

    it('should save data when execution is successful', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['glofasMonitored'], 'execute')
        .mockResolvedValue({ data: mockIndicators } as any);

      await service.synchronizeGlofas();

      expect(mockGlofasServices.saveDataInGlofas).toHaveBeenCalledWith(
        'test-basin-id',
        mockIndicators[0],
      );
    });

    it('should handle error when execution fails with non-AxiosError', async () => {
      const error = new Error('Generic error');
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['glofasMonitored'], 'execute')
        .mockResolvedValue({ details: error } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.synchronizeGlofas();

      expect(loggerSpy).toHaveBeenCalledWith(error);
      expect(mockGlofasServices.saveDataInGlofas).not.toHaveBeenCalled();
    });

    it('should handle error when execution fails with AxiosError', async () => {
      const axiosError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Access denied' },
          config: { url: 'test-url' },
        },
      } as AxiosError;
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['glofasMonitored'], 'execute')
        .mockResolvedValue({ details: axiosError } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.synchronizeGlofas();

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(axiosError);
      expect(mockGlofasServices.saveDataInGlofas).not.toHaveBeenCalled();
    });

    it('should handle multiple indicators', async () => {
      const multipleIndicators: Indicator[] = [
        {
          kind: 'FORECAST',
          indicator: 'prob_flood',
          value: 0.3,
          units: 'probability',
          issuedAt: new Date().toISOString(),
          location: { type: 'BASIN', basinId: 'basin-1' },
          source: { key: 'glofas' },
          info: { data: '1' },
        },
        {
          kind: 'FORECAST',
          indicator: 'prob_flood',
          value: 0.7,
          units: 'probability',
          issuedAt: new Date().toISOString(),
          location: { type: 'BASIN', basinId: 'basin-2' },
          source: { key: 'glofas' },
          info: { data: '2' },
        },
      ];

      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['glofasMonitored'], 'execute')
        .mockResolvedValue({ data: multipleIndicators } as any);

      await service.synchronizeGlofas();

      expect(mockGlofasServices.saveDataInGlofas).toHaveBeenCalledTimes(2);
      expect(mockGlofasServices.saveDataInGlofas).toHaveBeenNthCalledWith(
        1,
        'basin-1',
        multipleIndicators[0],
      );
      expect(mockGlofasServices.saveDataInGlofas).toHaveBeenNthCalledWith(
        2,
        'basin-2',
        multipleIndicators[1],
      );
    });
  });

  describe('syncGfhData', () => {
    const mockIndicators: Indicator[] = [
      {
        kind: 'FORECAST',
        indicator: 'water_level_m',
        value: 10,
        units: 'm',
        issuedAt: new Date().toISOString(),
        location: { type: 'BASIN', basinId: 'test-basin-id' },
        source: { key: 'gfh' },
        info: { test: 'data' },
      },
    ];

    it('should save data when execution is successful', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['gfhMonitored'], 'execute')
        .mockResolvedValue({ data: mockIndicators } as any);

      await service.syncGfhData();

      expect(mockGfhService.saveDataInGfh).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'test-basin-id',
        mockIndicators[0],
      );
    });

    it('should handle error when execution fails with non-AxiosError', async () => {
      const error = new Error('Generic error');
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['gfhMonitored'], 'execute')
        .mockResolvedValue({ details: error } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncGfhData();

      expect(loggerSpy).toHaveBeenCalledWith(error);
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should handle error when execution fails with AxiosError', async () => {
      const axiosError = {
        response: {
          status: 502,
          statusText: 'Bad Gateway',
          data: { error: 'Gateway error' },
          config: { url: 'test-url' },
        },
      } as AxiosError;
      getMockIsErr().mockReturnValue(true);
      jest
        .spyOn(service['gfhMonitored'], 'execute')
        .mockResolvedValue({ details: axiosError } as any);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncGfhData();

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(axiosError);
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should handle empty indicators array', async () => {
      getMockIsErr().mockReturnValue(false);
      jest
        .spyOn(service['gfhMonitored'], 'execute')
        .mockResolvedValue({ data: [] } as any);

      await service.syncGfhData();

      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });
  });

  describe('getDhmWaterLevels', () => {
    const mockDate = new Date('2023-01-01');
    const mockSeriesId = 12345;
    const mockPeriod = SourceDataType.Daily;

    const mockStationDetail: RiverStationItem = {
      name: 'Test Station',
      id: 1,
      stationIndex: 'ST001',
      basin: 'Test Basin',
      district: 'Test District',
      latitude: 28.5,
      longitude: 80.4,
      series_id: mockSeriesId,
      waterLevel: {
        value: 10,
        datetime: new Date().toISOString(),
      },
      status: 'active',
      warning_level: '5',
      danger_level: '10',
      steady: 'yes',
      onm: 'test',
      description: 'Test station',
      elevation: 100,
      images: [],
      tags: [],
      indicator: 'water_level_m',
      units: 'm',
      value: 10,
    };

    const mockObservation: DhmObservation = {
      stationDetail: mockStationDetail,
      seriesId: mockSeriesId,
      data: [
        { datetime: '2023-01-01T00:00:00Z', value: 10 },
        { datetime: '2023-01-01T01:00:00Z', value: 20 },
      ],
    };

    it('should return water levels data when execution is successful', async () => {
      getMockIsErr().mockReturnValue(false);
      mockDhmWaterLevelAdapter.executeByPeriod.mockResolvedValue({
        data: [mockObservation],
      });

      const result = await service.getDhmWaterLevels(
        mockDate,
        mockPeriod,
        mockSeriesId,
      );

      expect(mockDhmWaterLevelAdapter.executeByPeriod).toHaveBeenCalledWith(
        mockDate,
        mockSeriesId,
        DhmSourceDataTypeEnum[mockPeriod],
      );

      expect(result).toEqual({
        ...mockStationDetail,
        history: mockObservation.data,
      });
    });

    it('should throw RpcException when execution fails', async () => {
      const error = 'Execution failed';
      getMockIsErr().mockReturnValue(true);
      mockDhmWaterLevelAdapter.executeByPeriod.mockResolvedValue({
        error,
      });
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await expect(
        service.getDhmWaterLevels(mockDate, mockPeriod, mockSeriesId),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(error);
    });

    it('should handle empty observations array', async () => {
      getMockIsErr().mockReturnValue(false);
      mockDhmWaterLevelAdapter.executeByPeriod.mockResolvedValue({
        data: [],
      });

      await expect(
        service.getDhmWaterLevels(mockDate, mockPeriod, mockSeriesId),
      ).rejects.toThrow();
    });

    it('should handle different period types', async () => {
      getMockIsErr().mockReturnValue(false);
      mockDhmWaterLevelAdapter.executeByPeriod.mockResolvedValue({
        data: [mockObservation],
      });

      await service.getDhmWaterLevels(
        mockDate,
        SourceDataType.Hourly,
        mockSeriesId,
      );

      expect(mockDhmWaterLevelAdapter.executeByPeriod).toHaveBeenCalledWith(
        mockDate,
        mockSeriesId,
        DhmSourceDataTypeEnum[SourceDataType.Hourly],
      );
    });
  });
});
