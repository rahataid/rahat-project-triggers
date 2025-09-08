import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from '@prisma/client';
import { GlofasService } from './glofas.service';
import { RpcException } from '@nestjs/microservices';
import { AddTriggerStatementDto } from './dto';
import { SourcesDataService } from './sources-data.service';
import { of } from 'rxjs';
import { SettingsService } from '@rumsan/settings';

jest.mock('@rumsan/settings', () => ({
  SettingsService: {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'DATASOURCE.GLOFAS') {
        return {
          LOCATION: 'test-location',
          URL: 'http://test-url.com',
        };
      }
      return {
        GLOFAS: [
          {
            LOCATION: 'test-location',
            URL: 'http://test-url.com',
          },
        ],
      };
    }),
  },
}));

describe('GlofasService', () => {
  let service: GlofasService;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let triggerQueue: Queue;
  let eventEmitter: EventEmitter2;
  let sourceDataService: SourcesDataService;

  const mockPrismaService = {
    trigger: {
      findUnique: jest.fn(),
    },
    sourcesData: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    source: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  const mockTriggerQueue = {
    add: jest.fn(),
    process: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockSourceDataService = {
    getWaterLevels: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlofasService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: 'BullQueue_TRIGGER',
          useValue: mockTriggerQueue,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: SourcesDataService,
          useValue: mockSourceDataService,
        },
      ],
    }).compile();

    service = module.get<GlofasService>(GlofasService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    triggerQueue = module.get<Queue>('BullQueue_TRIGGER');
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    sourceDataService = module.get<SourcesDataService>(SourcesDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('criteriaCheck', () => {
    const mockPayload: AddTriggerStatementDto = {
      uuid: 'test-uuid',
      dataSource: DataSource.GLOFAS,
      riverBasin: 'test-basin',
      isMandatory: true,
      phaseId: 'phase-uuid',
      triggerStatement: {
        probability: 0.8,
        maxLeadTimeDays: 3,
      },
    };

    const mockTriggerData = {
      uuid: 'test-uuid',
      isTriggered: false,
      repeatEvery: 'daily',
      repeatKey: 'test-key',
    };

    const mockRecentData = {
      id: 1,
      info: {
        returnPeriodTable: {
          returnPeriodData: [['2023-01-01-1', '2023-01-02-2', '2023-01-03-3']],
          returnPeriodHeaders: ['1', '2', '3'],
        },
      },
    };

    beforeEach(() => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTriggerData);
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(mockRecentData);
    });

    it('should check criteria successfully', async () => {
      await service.criteriaCheck(mockPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
      });

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: mockPayload.riverBasin,
            source: {
              has: DataSource.GLOFAS,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return early if trigger is already triggered', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue({
        ...mockTriggerData,
        isTriggered: true,
      });

      await service.criteriaCheck(mockPayload);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('events.automated_triggered', {
        repeatKey: mockTriggerData.repeatKey,
      });
    });

    it('should return early if no recent data found', async () => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(null);

      await service.criteriaCheck(mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalled();
    });
  });

  describe('getStationData', () => {
    const mockPayload = {
      station: 'test-station',
      date: '2023-01-01',
      URL: 'http://test-url.com',
    } as any;

    const mockResponse = { data: 'station-data' };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockResponse }));
    });

    it('should return station data successfully', async () => {
      mockHttpService.axiosRef.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getStationData(mockPayload);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should throw RpcException when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockHttpService.axiosRef.get.mockRejectedValue(error);

      await expect(service.getStationData(mockPayload)).rejects.toThrow();
    });
  });

  describe('saveGlofasStationData', () => {
    const mockRiverBasin = 'test-basin';
    const mockPayload = {
      forecastDate: '2023-01-01',
      returnPeriodTable: {
        returnPeriodData: [['2023-01-01-1']],
        returnPeriodHeaders: ['1'],
      },
    } as any;

    beforeEach(() => {
      mockPrismaService.source.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.sourcesData.create.mockResolvedValue({ id: 1 });
    });

    it('should save data successfully when source exists', async () => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(null);
      mockSourceDataService.create.mockResolvedValue({ id: 1 });

      const result = await service.saveGlofasStationData(mockRiverBasin, mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          dataSource: DataSource.GLOFAS,
          source: {
            riverBasin: mockRiverBasin,
          },
          info: {
            path: ['forecastDate'],
            equals: mockPayload.forecastDate,
          },
        },
      });

      expect(mockSourceDataService.create).toHaveBeenCalledWith({
        riverBasin: mockRiverBasin,
        source: 'GLOFAS',
        type: 'WATER_LEVEL',
        info: JSON.parse(JSON.stringify(mockPayload)),
      });

      expect(result).toBeUndefined();
    });

    it('should not create new record when record already exists', async () => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue({ id: 1 });

      const result = await service.saveGlofasStationData(mockRiverBasin, mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalled();
      expect(mockSourceDataService.create).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle error when saving fails', async () => {
      const error = new Error('Database error');
      mockPrismaService.sourcesData.findFirst.mockRejectedValue(error);

      // The method catches errors and logs them, so it should not throw
      await expect(service.saveGlofasStationData(mockRiverBasin, mockPayload)).resolves.not.toThrow();
    });
  });

  describe('getLatestWaterLevels', () => {
    const mockWaterLevels = [
      { id: 1, info: { level: 100 } },
      { id: 2, info: { level: 150 } },
    ];

    beforeEach(() => {
      mockPrismaService.sourcesData.findMany.mockResolvedValue(mockWaterLevels);
    });

    it('should return latest water levels', async () => {
      const mockWaterLevel = { id: 1, info: { level: 100 } };
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(mockWaterLevel);

      const result = await service.getLatestWaterLevels();

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: 'test-location',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(mockWaterLevel);
    });
  });

  describe('checkProbability', () => {
    it('should return true when probability threshold is met', () => {
      const indexRange = [0, 1, 2];
      const latestForecastData = ['0.9', '0.8', '0.7'];
      const probability = 0.8;

      const result = service.checkProbability(indexRange, latestForecastData, probability);

      expect(result).toBe(true);
    });

    it('should return undefined when probability threshold is not met', () => {
      const indexRange = [0, 1, 2];
      const latestForecastData = ['0.5', '0.6', '0.7'];
      const probability = 0.8;

      const result = service.checkProbability(indexRange, latestForecastData, probability);

      expect(result).toBeUndefined();
    });
  });

  describe('createRange', () => {
    it('should create range correctly', () => {
      const result = service.createRange(1, 5);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle single number range', () => {
      const result = service.createRange(1, 1);

      expect(result).toEqual([1]);
    });
  });

  describe('findGlofasDataByDate', () => {
    const mockRiverBasin = 'test-basin';
    const mockForecastDate = '2023-01-01';
    const mockData = { id: 1, info: { date: mockForecastDate } };

    beforeEach(() => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(mockData);
    });

    it('should find Glofas data by date', async () => {
      const result = await service.findGlofasDataByDate(mockRiverBasin, mockForecastDate);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: {
              contains: mockRiverBasin,
            },
          },
          dataSource: DataSource.GLOFAS,
          info: {
            path: ['forecastDate'],
            equals: mockForecastDate,
          },
        },
      });

      expect(result).toEqual(mockData);
    });

    it('should return null when no data found', async () => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(null);

      const result = await service.findGlofasDataByDate(mockRiverBasin, mockForecastDate);

      expect(result).toBeNull();
    });
  });
}); 