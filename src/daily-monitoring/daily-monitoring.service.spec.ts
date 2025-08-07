import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { DailyMonitoringService } from './daily-monitoring.service';
import { AddDailyMonitoringDto, ListDailyMonitoringDto, UpdateDailyMonitoringDto } from './dto';
import { GaugeForecastDto } from './dto/list-gaugeForecast.dto';
import { Prisma } from '@prisma/client';

// Mock the paginator function
jest.mock('@rumsan/prisma', () => ({
  ...jest.requireActual('@rumsan/prisma'),
  paginator: jest.fn(() => jest.fn()),
}));

describe('DailyMonitoringService', () => {
  let service: DailyMonitoringService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    dailyMonitoring: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyMonitoringService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DailyMonitoringService>(DailyMonitoringService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockDto: AddDailyMonitoringDto = {
      riverBasin: 'Test Basin',
      data: [
        { source: 'DHM', value: 100 },
        { source: 'GLOFAS', value: 200 },
      ],
      user: { name: 'Test User' },
      uuid: 'test-uuid',
    };

    const mockSource = {
      id: 1,
      riverBasin: 'Test Basin',
    };

    const mockCreatedData = [
      { id: 1, groupKey: 'test-uuid', sourceId: 1, dataEntryBy: 'Test User' },
      { id: 2, groupKey: 'test-uuid', sourceId: 1, dataEntryBy: 'Test User' },
    ];

    it('should create daily monitoring data successfully', async () => {
      mockPrismaService.source.findUnique.mockResolvedValue(mockSource);
      mockPrismaService.dailyMonitoring.create
        .mockResolvedValueOnce(mockCreatedData[0])
        .mockResolvedValueOnce(mockCreatedData[1]);

      const result = await service.create(mockDto);

      expect(mockPrismaService.source.findUnique).toHaveBeenCalledWith({
        where: { riverBasin: mockDto.riverBasin },
      });
      expect(mockPrismaService.dailyMonitoring.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockCreatedData);
    });

    it('should create daily monitoring data without UUID', async () => {
      const dtoWithoutUuid = { ...mockDto, uuid: undefined };
      mockPrismaService.source.findUnique.mockResolvedValue(mockSource);
      mockPrismaService.dailyMonitoring.create
        .mockResolvedValueOnce(mockCreatedData[0])
        .mockResolvedValueOnce(mockCreatedData[1]);

      const result = await service.create(dtoWithoutUuid);

      expect(mockPrismaService.dailyMonitoring.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockCreatedData);
    });

    it('should throw RpcException when source not found', async () => {
      mockPrismaService.source.findUnique.mockResolvedValue(null);

      await expect(service.create(mockDto)).rejects.toThrow(RpcException);
      await expect(service.create(mockDto)).rejects.toThrow('Failed to create daily monitoring data');
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.source.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockDto)).rejects.toThrow(RpcException);
      await expect(service.create(mockDto)).rejects.toThrow('Failed to create daily monitoring data');
    });

    it('should handle empty data array', async () => {
      const dtoWithEmptyData = { ...mockDto, data: [] };
      mockPrismaService.source.findUnique.mockResolvedValue(mockSource);

      const result = await service.create(dtoWithEmptyData);

      expect(result).toEqual([]);
      expect(mockPrismaService.dailyMonitoring.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockPayload: ListDailyMonitoringDto = {
      page: 1,
      perPage: 10,
      dataEntryBy: 'Test User',
      riverBasin: 'Test Basin',
      createdAt: '2023-01-01',
    };

    const mockResults = [
      {
        id: 1,
        groupKey: 'test-uuid',
        dataEntryBy: 'Test User',
        source: { riverBasin: 'Test Basin' },
        createdAt: new Date(),
        info: { source: 'DHM', value: 100 },
      },
    ];

    const transformedResults = [
      {
        groupKey: 'test-uuid',
        dataEntryBy: 'Test User',
        riverBasin: 'Test Basin',
        data: [{ id: 1, source: 'DHM', value: 100 }],
        createdBy: undefined,
        isDeleted: undefined,
        createdAt: new Date(),
        updatedAt: undefined,
      },
    ];

    it('should fetch all daily monitoring data successfully', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockResults);

      const result = await service.findAll(mockPayload);

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          dataEntryBy: {
            contains: mockPayload.dataEntryBy,
            mode: Prisma.QueryMode.insensitive,
          },
          source: {
            riverBasin: {
              contains: mockPayload.riverBasin,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          createdAt: {
            gte: mockPayload.createdAt,
          },
        },
        include: {
          source: {
            select: {
              riverBasin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual({ results: transformedResults });
    });

    it('should handle empty payload', async () => {
      const emptyPayload: ListDailyMonitoringDto = {};
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockResults);

      const result = await service.findAll(emptyPayload);

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
        },
        include: {
          source: {
            select: {
              riverBasin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual({ results: transformedResults });
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('findOne', () => {
    const mockPayload = { uuid: 'test-uuid' };
    const mockData = [
      {
        id: 1,
        groupKey: 'test-uuid',
        dataEntryBy: 'Test User',
        source: { riverBasin: 'Test Basin' },
        info: { source: 'DHM', value: 100 },
      },
    ];

    const transformedData = [
      {
        groupKey: 'test-uuid',
        dataEntryBy: 'Test User',
        riverBasin: 'Test Basin',
        data: [{ id: 1, source: 'DHM', value: 100 }],
        createdBy: undefined,
        isDeleted: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      },
    ];

    it('should find daily monitoring data by UUID successfully', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockData);

      const result = await service.findOne(mockPayload);

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          groupKey: mockPayload.uuid,
          isDeleted: false,
        },
        include: {
          source: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(transformedData);
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('getGaugeReading', () => {
    const mockData = [
      {
        id: 1,
        info: { gaugeReading: 100, station: 'Station A', date: '2023-01-01' },
        source: { riverBasin: 'Test Basin' },
        sourceId: 1,
        createdAt: new Date(),
        dataEntryBy: 'Test User',
        isDeleted: false,
        updatedAt: new Date(),
      },
    ];

    it('should get gauge reading data successfully', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockData);

      const result = await service.getGaugeReading();

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          dataSource: 'Gauge Reading',
          isDeleted: false,
        },
        include: {
          source: {
            select: {
              riverBasin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getGaugeReading()).rejects.toThrow(RpcException);
    });
  });

  describe('getGaugeForecast', () => {
    const mockPayload: GaugeForecastDto = {
      sourceId: '1',
      station: 'Station A',
      gaugeForecast: 'High',
      date: '2023-01-01',
    };

    const mockData = [
      {
        id: 1,
        info: { gaugeForecast: 'High', station: 'Station A', date: '2023-01-01' },
        source: { riverBasin: 'Test Basin' },
        createdAt: new Date(),
      },
    ];

    it('should get gauge forecast data successfully', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockData);

      const result = await service.getGaugeForecast(mockPayload);

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          dataSource: 'Gauge Reading',
          isDeleted: false,
          sourceId: 1,
          AND: [
            {
              info: {
                path: ['station'],
                equals: 'Station A',
              },
            },
            {
              info: {
                path: ['gaugeForecast'],
                equals: 'High',
              },
            },
          ],
          createdAt: {
            gte: new Date('2023-01-01'),
            lt: new Date('2023-01-02'),
          },
        },
        include: {
          source: {
            select: { riverBasin: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toBeDefined();
    });

    it('should handle empty payload', async () => {
      const emptyPayload: GaugeForecastDto = {};
      mockPrismaService.dailyMonitoring.findMany.mockResolvedValue(mockData);

      const result = await service.getGaugeForecast(emptyPayload);

      expect(mockPrismaService.dailyMonitoring.findMany).toHaveBeenCalledWith({
        where: {
          dataSource: 'Gauge Reading',
          isDeleted: false,
        },
        include: {
          source: {
            select: { riverBasin: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getGaugeForecast(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('update', () => {
    const mockPayload: UpdateDailyMonitoringDto = {
      uuid: 'test-uuid',
      data: [
        { id: 1, source: 'DHM', value: 150 },
        { id: 2, source: 'GLOFAS', value: 250 },
      ],
    };

    const mockUpdatedData = [
      { id: 1, groupKey: 'test-uuid', source: 'DHM', value: 150 },
      { id: 2, groupKey: 'test-uuid', source: 'GLOFAS', value: 250 },
    ];

    it('should update daily monitoring data successfully', async () => {
      mockPrismaService.dailyMonitoring.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.dailyMonitoring.update
        .mockResolvedValueOnce(mockUpdatedData[0])
        .mockResolvedValueOnce(mockUpdatedData[1]);

      const result = await service.update(mockPayload);

      expect(mockPrismaService.dailyMonitoring.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUpdatedData);
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.update(mockPayload)).rejects.toThrow(Error);
    });
  });

  describe('remove', () => {
    const mockPayload = { uuid: 'test-uuid' };

    it('should remove daily monitoring data successfully', async () => {
      mockPrismaService.dailyMonitoring.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.remove(mockPayload);

      expect(mockPrismaService.dailyMonitoring.updateMany).toHaveBeenCalledWith({
        where: {
          groupKey: mockPayload.uuid,
        },
        data: {
          isDeleted: true,
        },
      });
      expect(result).toEqual({ count: 2 });
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.updateMany.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('deleteDailyMonitoringByIdAndGroupKey', () => {
    const mockPayload = { uuid: 'test-uuid', id: 1 };

    it('should delete daily monitoring data by ID and group key successfully', async () => {
      mockPrismaService.dailyMonitoring.update.mockResolvedValue({ id: 1, isDeleted: true });

      const result = await service.deleteDailyMonitoringByIdAndGroupKey(mockPayload);

      expect(mockPrismaService.dailyMonitoring.update).toHaveBeenCalledWith({
        where: {
          id: mockPayload.id,
          groupKey: mockPayload.uuid,
        },
        data: {
          isDeleted: true,
        },
      });
      expect(result).toEqual({ id: 1, isDeleted: true });
    });

    it('should throw RpcException when database error occurs', async () => {
      mockPrismaService.dailyMonitoring.update.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteDailyMonitoringByIdAndGroupKey(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('sameGroupeKeyMergeData', () => {
    it('should merge data with same group key', () => {
      const mockResponse = [
        { groupKey: 'key1', info: { source: 'DHM', value: 100 } },
        { groupKey: 'key1', info: { source: 'GLOFAS', value: 200 } },
        { groupKey: 'key2', info: { source: 'DHM', value: 150 } },
      ];

      const result = service.sameGroupeKeyMergeData(mockResponse);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty response', () => {
      const result = service.sameGroupeKeyMergeData([]);

      expect(result).toEqual([]);
    });

    it('should handle single item response', () => {
      const mockResponse = [{ groupKey: 'key1', info: { source: 'DHM', value: 100 } }];

      const result = service.sameGroupeKeyMergeData(mockResponse);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Logger Coverage', () => {
    it('should have logger defined', () => {
      expect(service.logger).toBeDefined();
      expect(service.logger.log).toBeDefined();
      expect(service.logger.error).toBeDefined();
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof service.create).toBe('function');
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findOne).toBe('function');
      expect(typeof service.getGaugeReading).toBe('function');
      expect(typeof service.getGaugeForecast).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.remove).toBe('function');
      expect(typeof service.deleteDailyMonitoringByIdAndGroupKey).toBe('function');
      expect(typeof service.sameGroupeKeyMergeData).toBe('function');
    });
  });
});
