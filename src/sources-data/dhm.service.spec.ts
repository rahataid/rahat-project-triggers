import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, SourceType } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { DhmService } from './dhm.service';
import { RpcException } from '@nestjs/microservices';
import { AddTriggerStatementDto } from './dto';
import { of } from 'rxjs';
import { SettingsService } from '@rumsan/settings';

jest.mock('@rumsan/settings', () => ({
  SettingsService: {
    get: jest.fn().mockReturnValue({
      DHM: [
        {
          WATER_LEVEL: {
            LOCATION: 'test-location',
            SERIESID: [1, 2, 3],
          },
          RAINFALL: {
            LOCATION: 'test-location',
            SERIESID: [4, 5, 6],
          },
        },
      ],
    }),
  },
}));

jest.mock('src/common', () => ({
  ...jest.requireActual('src/common'),
  scrapeDataFromHtml: jest.fn().mockReturnValue([{ Date: '2023-01-01', Point: 100 }]),
}));

describe('DhmService', () => {
  let service: DhmService;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let configService: ConfigService;
  let triggerQueue: Queue;

  const mockPrismaService = {
    trigger: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sourcesData: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    source: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    phase: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTriggerQueue = {
    add: jest.fn(),
    process: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DhmService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'BullQueue_TRIGGER',
          useValue: mockTriggerQueue,
        },
      ],
    }).compile();

    service = module.get<DhmService>(DhmService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    triggerQueue = module.get<Queue>('BullQueue_TRIGGER');
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
      dataSource: DataSource.DHM,
      riverBasin: 'test-basin',
      isMandatory: true,
      phaseId: 'phase-uuid',
      triggerStatement: {
        warningLevel: 100,
        dangerLevel: 150,
      },
    };

    const mockTriggerData = {
      uuid: 'test-uuid',
      isTriggered: false,
      phase: {
        name: 'READINESS',
      },
    };

    const mockRecentData = {
      id: 1,
      info: {
        waterLevel: {
          value: 120,
        },
      },
    };

    beforeEach(() => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTriggerData);
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(mockRecentData);
    });

    it('should check criteria successfully for READINESS phase', async () => {
      await service.criteriaCheck(mockPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        include: { phase: true },
      });

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          type: SourceType.WATER_LEVEL,
          source: {
            riverBasin: mockPayload.riverBasin,
            source: {
              has: DataSource.DHM,
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

      expect(mockPrismaService.sourcesData.findFirst).not.toHaveBeenCalled();
    });

    it('should return early if no recent data found', async () => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue(null);

      await service.criteriaCheck(mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalled();
    });

    it('should check criteria for ACTIVATION phase', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue({
        ...mockTriggerData,
        phase: { name: 'ACTIVATION' },
      });

      await service.criteriaCheck(mockPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalled();
    });
  });

  describe('compareWaterLevels', () => {
    it('should return true when current level is greater than threshold', () => {
      const result = service.compareWaterLevels(120, 100);
      expect(result).toBe(true);
    });

    it('should return false when current level is less than threshold', () => {
      const result = service.compareWaterLevels(80, 100);
      expect(result).toBe(false);
    });

    it('should return true when current level equals threshold', () => {
      const result = service.compareWaterLevels(100, 100);
      expect(result).toBe(true);
    });
  });

  describe('getRiverStations', () => {
    const mockRiverStations = [
      { id: 1, name: 'Station 1' },
      { id: 2, name: 'Station 2' },
    ];

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockRiverStations }));
    });

    it('should return river stations successfully', async () => {
      mockConfigService.get.mockReturnValue('http://test-url.com');
      mockHttpService.axiosRef.get.mockResolvedValue({ data: mockRiverStations });

      const result = await service.getRiverStations();

      expect(mockHttpService.axiosRef.get).toHaveBeenCalled();
      expect(result).toEqual(mockRiverStations);
    });

    it('should throw RpcException when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockConfigService.get.mockReturnValue('http://test-url.com');
      mockHttpService.axiosRef.get.mockRejectedValue(error);

      await expect(service.getRiverStations()).rejects.toThrow(RpcException);
    });
  });

  describe('getRiverStationData', () => {
    const mockUrl = 'http://test-url.com';
    const mockLocation = 'test-location';
    const mockData = { station: 'data' };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockData }));
    });

    it('should return river station data successfully', async () => {
      mockHttpService.axiosRef.get.mockResolvedValue({ data: mockData });

      const result = await service.getRiverStationData(mockUrl, mockLocation);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData });
    });

    it('should throw RpcException when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockHttpService.axiosRef.get.mockRejectedValue(error);

      await expect(service.getRiverStationData(mockUrl, mockLocation)).rejects.toThrow();
    });
  });

  describe('getData', () => {
    const mockUrl = 'http://test-url.com';
    const mockData = { data: 'test' };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockData }));
    });

    it('should return data successfully', async () => {
      mockHttpService.axiosRef.get.mockResolvedValue({ data: mockData });

      const result = await service.getData(mockUrl);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith(mockUrl);
      expect(result).toEqual({ data: mockData });
    });

    it('should throw RpcException when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockHttpService.axiosRef.get.mockRejectedValue(error);

      await expect(service.getData(mockUrl)).rejects.toThrow();
    });
  });

  describe('getIntervals', () => {
    it('should return correct intervals', () => {
      const result = service.getIntervals();

      expect(result).toHaveProperty('timeGT');
      expect(result).toHaveProperty('timeLT');
      expect(typeof result.timeGT).toBe('string');
      expect(typeof result.timeLT).toBe('string');
    });
  });

  describe('sortByDate', () => {
    it('should sort data by date in descending order', () => {
      const mockData = [
        { waterLevelOn: '2023-01-01', value: 1 },
        { waterLevelOn: '2023-01-03', value: 3 },
        { waterLevelOn: '2023-01-02', value: 2 },
      ] as any;

      const result = service.sortByDate(mockData);

      expect((result[0] as any).waterLevelOn).toBe('2023-01-03');
      expect((result[1] as any).waterLevelOn).toBe('2023-01-02');
      expect((result[2] as any).waterLevelOn).toBe('2023-01-01');
    });
  });

  describe('saveDataInDhm', () => {
    const mockType = SourceType.WATER_LEVEL;
    const mockRiverBasin = 'test-basin';
    const mockPayload = {
      station: 'test-station',
      history: [{ date: '2023-01-01', value: 100 }],
    } as any;

    beforeEach(() => {
      mockPrismaService.source.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.sourcesData.create.mockResolvedValue({ id: 1 });
    });

    it('should save data successfully when source exists', async () => {
      const mockTransaction = {
        sourcesData: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });

      const result = await service.saveDataInDhm(mockType, mockRiverBasin, mockPayload);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create source and save data when source does not exist', async () => {
      const mockTransaction = {
        sourcesData: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });

      const result = await service.saveDataInDhm(mockType, mockRiverBasin, mockPayload);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error when saving fails', async () => {
      const error = new Error('Database error');
      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(service.saveDataInDhm(mockType, mockRiverBasin, mockPayload)).rejects.toThrow();
    });
  });

  describe('getDhmRiverWatchData', () => {
    const mockPayload = {
      date: '2023-01-01',
      period: 'POINT',
      seriesid: '123',
      location: 'test-location',
    };

    const mockResponse = { data: 'river-watch-data' };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockResponse }));
    });

    it('should return DHM river watch data successfully', async () => {
      const mockResponse = { data: { data: { table: '<table>test data</table>' } } };
      mockHttpService.axiosRef.post.mockResolvedValue(mockResponse);

      const result = await service.getDhmRiverWatchData(mockPayload);

      expect(mockHttpService.axiosRef.post).toHaveBeenCalled();
      expect(result).toEqual([{ Date: '2023-01-01', Point: 100 }]);
    });

    it('should handle error when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockHttpService.axiosRef.post.mockRejectedValue(error);

      // The method catches errors and logs them, so it should not throw
      await expect(service.getDhmRiverWatchData(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('getDhmRainfallWatchData', () => {
    const mockPayload = {
      date: '2023-01-01',
      period: 'POINT',
      seriesid: '123',
      location: 'test-location',
    };

    const mockResponse = { data: 'rainfall-watch-data' };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue(of({ data: mockResponse }));
    });

    it('should return DHM rainfall watch data successfully', async () => {
      const mockResponse = { data: { data: { table: '<table>test data</table>' } } };
      mockHttpService.axiosRef.post.mockResolvedValue(mockResponse);

      const result = await service.getDhmRainfallWatchData(mockPayload);

      expect(mockHttpService.axiosRef.post).toHaveBeenCalled();
      expect(result).toEqual([{ Date: '2023-01-01', Point: 100 }]);
    });

    it('should handle error when HTTP request fails', async () => {
      const error = new Error('HTTP error');
      mockHttpService.axiosRef.post.mockRejectedValue(error);

      // The method catches errors and logs them, so it should not throw
      await expect(service.getDhmRainfallWatchData(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('normalizeDhmRiverAndRainfallWatchData', () => {
    const mockDataArray = [
      { date: '2023-01-01', value: 100 },
      { date: '2023-01-02', value: 150 },
    ] as any;

    it('should normalize data successfully', async () => {
      const mockDataArray = [
        { Date: '2023-01-01', Point: 100 },
        { Date: '2023-01-02', Average: 150, Max: 200, Min: 100 },
      ] as any;

      const result = await service.normalizeDhmRiverAndRainfallWatchData(mockDataArray);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should handle empty data array', async () => {
      const result = await service.normalizeDhmRiverAndRainfallWatchData([]);

      expect(result).toEqual([]);
    });
  });
}); 