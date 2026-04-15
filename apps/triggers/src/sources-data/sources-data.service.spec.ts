import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService, DataSource, SourceType } from '@lib/database';
import { SourcesDataService } from './sources-data.service';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { PaginationDto } from 'src/common/dto';
import { GetSouceDataDto, SourceDataType } from './dto/get-source-data';
import { GetSeriesDto } from './dto/get-series';
import { GetDhmSingleSeriesDto } from './dto/get-dhm-single-series.dto';
import { DhmService } from '@lib/dhm-adapter';
import { GlofasServices } from '@lib/glofas-adapter';
import { GfhService } from '@lib/gfh-adapter';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';

jest.mock('@lib/database', () => {
  const actual = jest.requireActual('@lib/database');
  const mockPaginateFn = jest.fn();
  (globalThis as any).__sourcesDataMockPaginateFn = mockPaginateFn;
  return {
    ...actual,
    paginator: jest.fn(() => mockPaginateFn),
  };
});

const getMockPaginateFn = (): jest.Mock => {
  return (globalThis as any).__sourcesDataMockPaginateFn;
};

describe('SourcesDataService', () => {
  let service: SourcesDataService;

  const mockPrismaService = {
    sourcesData: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockDhmService = {
    getSourceData: jest.fn(),
  };

  const mockGlofasServices = {
    getSourceData: jest.fn(),
  };

  const mockGfhService = {
    getSourceData: jest.fn(),
  };

  const mockScheduleSourcesDataService = {
    getDhmWaterLevels: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourcesDataService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
          provide: ScheduleSourcesDataService,
          useValue: mockScheduleSourcesDataService,
        },
      ],
    }).compile();

    service = module.get<SourcesDataService>(SourcesDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateDto: CreateSourcesDataDto = {
      info: { test: 'data' },
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      type: SourceType.WATER_LEVEL,
    };

    const mockCreatedData = {
      id: 1,
      info: { test: 'data' },
      type: SourceType.WATER_LEVEL,
      dataSource: DataSource.DHM,
      source: {
        id: 1,
        riverBasin: 'test-basin',
        source: [DataSource.DHM],
      },
    };

    beforeEach(() => {
      mockPrismaService.sourcesData.create.mockResolvedValue(mockCreatedData);
    });

    it('should create source data successfully', async () => {
      const result = await service.create(mockCreateDto);

      expect(mockPrismaService.sourcesData.create).toHaveBeenCalledWith({
        data: {
          info: mockCreateDto.info,
          type: mockCreateDto.type,
          dataSource: mockCreateDto.source,
          source: {
            connectOrCreate: {
              where: {
                riverBasin: mockCreateDto.riverBasin,
              },
              create: {
                riverBasin: mockCreateDto.riverBasin,
                source: [mockCreateDto.source],
              },
            },
          },
        },
        include: {
          source: true,
        },
      });

      expect(result).toEqual(mockCreatedData);
    });

    it('should throw RpcException when creation fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockPrismaService.sourcesData.create.mockRejectedValue(error);

      await expect(service.create(mockCreateDto)).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error while creatiing new source data',
        error,
      );
    });
  });

  describe('findAll', () => {
    const mockPaginationDto: PaginationDto = {
      page: 1,
      perPage: 10,
      order: 'asc',
      sort: 'createdAt',
    };

    const mockPaginatedResult = {
      data: [{ id: 1, info: { test: 'data' } }],
      meta: {
        total: 1,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    };

    beforeEach(() => {
      getMockPaginateFn().mockResolvedValue(mockPaginatedResult);
    });

    it('should return paginated results', async () => {
      const result = await service.findAll('test-app', mockPaginationDto);

      expect(getMockPaginateFn()).toHaveBeenCalledWith(
        mockPrismaService.sourcesData,
        {
          orderBy: {
            createdAt: 'asc',
          },
        },
        {
          page: 1,
          perPage: 10,
        },
      );

      expect(result).toEqual(mockPaginatedResult);
    });

    it('should throw RpcException when fetching fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      getMockPaginateFn().mockRejectedValue(error);

      await expect(
        service.findAll('test-app', mockPaginationDto),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error while fetching source data',
        error,
      );
    });
  });

  describe('findOne', () => {
    const mockId = 1;
    const mockSourceData = {
      id: mockId,
      info: { test: 'data' },
      type: SourceType.WATER_LEVEL,
    };

    beforeEach(() => {
      mockPrismaService.sourcesData.findUnique.mockResolvedValue(
        mockSourceData,
      );
    });

    it('should return source data by id', async () => {
      const result = await service.findOne(mockId);

      expect(mockPrismaService.sourcesData.findUnique).toHaveBeenCalledWith({
        where: { id: mockId },
      });

      expect(result).toEqual(mockSourceData);
    });

    it('should throw RpcException when fetching fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockPrismaService.sourcesData.findUnique.mockRejectedValue(error);

      await expect(service.findOne(mockId)).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Error while fetching source data with id: ${mockId}`,
        error,
      );
    });
  });

  describe('update', () => {
    const mockUpdateDto: UpdateSourcesDataDto = {
      id: 1,
      info: { updated: 'data' },
      source: DataSource.DHM,
      riverBasin: 'test-basin',
    };

    const mockUpdatedData = {
      id: 1,
      info: { updated: 'data' },
    };

    beforeEach(() => {
      mockPrismaService.sourcesData.update.mockResolvedValue(mockUpdatedData);
    });

    it('should update source data successfully', async () => {
      const result = await service.update(mockUpdateDto);

      expect(mockPrismaService.sourcesData.update).toHaveBeenCalledWith({
        where: { id: mockUpdateDto.id },
        data: {
          info: mockUpdateDto.info,
          source: {
            connect: {
              riverBasin: mockUpdateDto.riverBasin,
            },
          },
        },
      });

      expect(result).toEqual(mockUpdatedData);
    });

    it('should throw RpcException when update fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockPrismaService.sourcesData.update.mockRejectedValue(error);

      await expect(service.update(mockUpdateDto)).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error while updating source data info',
        error,
      );
    });
  });

  describe('findSeriesByDataSource', () => {
    const mockGetSeriesDto: GetSeriesDto = {
      dataSource: DataSource.DHM,
      type: SourceType.WATER_LEVEL,
      riverBasin: 'test-basin',
    };

    it('should return DHM source data', async () => {
      const mockDhmData = [{ id: 1, seriesId: 123 }];
      mockDhmService.getSourceData.mockResolvedValue(mockDhmData);

      const result = await service.findSeriesByDataSource(mockGetSeriesDto);

      expect(mockDhmService.getSourceData).toHaveBeenCalledWith(
        mockGetSeriesDto.type,
        mockGetSeriesDto.riverBasin,
        null,
      );

      expect(result).toEqual(mockDhmData);
    });

    it('should return GLOFAS source data', async () => {
      const mockGlofasData = [{ id: 1, location: 'test' }];
      mockGlofasServices.getSourceData.mockResolvedValue(mockGlofasData);

      const result = await service.findSeriesByDataSource({
        ...mockGetSeriesDto,
        dataSource: DataSource.GLOFAS,
      });

      expect(mockGlofasServices.getSourceData).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        mockGetSeriesDto.riverBasin,
      );

      expect(result).toEqual(mockGlofasData);
    });

    it('should return GLOFAS source data with default type when type is not provided', async () => {
      const mockGlofasData = [{ id: 1, location: 'test' }];
      mockGlofasServices.getSourceData.mockResolvedValue(mockGlofasData);

      const result = await service.findSeriesByDataSource({
        dataSource: DataSource.GLOFAS,
        riverBasin: 'test-basin',
      });

      expect(mockGlofasServices.getSourceData).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'test-basin',
      );

      expect(result).toEqual(mockGlofasData);
    });

    it('should return GFH source data', async () => {
      const mockGfhData = [{ id: 1, stationName: 'test-station' }];
      mockGfhService.getSourceData.mockResolvedValue(mockGfhData);

      const result = await service.findSeriesByDataSource({
        ...mockGetSeriesDto,
        dataSource: DataSource.GFH,
        stationName: 'test-station',
      });

      expect(mockGfhService.getSourceData).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        mockGetSeriesDto.riverBasin,
        'test-station',
      );

      expect(result).toEqual(mockGfhData);
    });

    it('should return GFH source data with default type when type is not provided', async () => {
      const mockGfhData = [{ id: 1, stationName: 'test-station' }];
      mockGfhService.getSourceData.mockResolvedValue(mockGfhData);

      const result = await service.findSeriesByDataSource({
        dataSource: DataSource.GFH,
        riverBasin: 'test-basin',
        stationName: 'test-station',
      });

      expect(mockGfhService.getSourceData).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'test-basin',
        'test-station',
      );

      expect(result).toEqual(mockGfhData);
    });

    it('should return empty array for unknown data source', async () => {
      const result = await service.findSeriesByDataSource({
        ...mockGetSeriesDto,
        dataSource: 'UNKNOWN' as DataSource,
      });

      expect(result).toEqual([]);
    });

    it('should throw RpcException when fetching fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockDhmService.getSourceData.mockRejectedValue(error);

      await expect(
        service.findSeriesByDataSource(mockGetSeriesDto),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error while fetching source data',
        error,
      );
    });
  });

  describe('getWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: SourceDataType.Point,
      appId: 'test-app',
    };

    beforeEach(() => {
      jest.spyOn(service, 'getLevels').mockResolvedValue({} as any);
    });

    it('should return water levels', async () => {
      const result = await service.getWaterLevels(mockPayload);

      expect(service.getLevels).toHaveBeenCalledWith(
        mockPayload,
        SourceType.WATER_LEVEL,
      );

      expect(result).toEqual({});
    });

    it('should throw RpcException when getting water levels fails', async () => {
      const error = new Error('Failed to fetch');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      jest.spyOn(service, 'getLevels').mockRejectedValue(error);

      await expect(service.getWaterLevels(mockPayload)).rejects.toThrow(
        RpcException,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        `Error while getting water levels: ${error}`,
      );
    });
  });

  describe('getRainfallLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: SourceDataType.Point,
      appId: 'test-app',
    };

    beforeEach(() => {
      jest.spyOn(service, 'getLevels').mockResolvedValue({} as any);
    });

    it('should return rainfall levels', async () => {
      const result = await service.getRainfallLevels(mockPayload);

      expect(service.getLevels).toHaveBeenCalledWith(
        mockPayload,
        SourceType.RAINFALL,
      );

      expect(result).toEqual({});
    });

    it('should throw RpcException when getting rainfall data fails', async () => {
      const error = new Error('Failed to fetch');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      jest.spyOn(service, 'getLevels').mockRejectedValue(error);

      await expect(service.getRainfallLevels(mockPayload)).rejects.toThrow(
        RpcException,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        `Error while getting rainfall data: ${error}`,
      );
    });
  });

  describe('isDateWithinLast14Days', () => {
    it('should return true for date within last 14 days', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);

      const result = service.isDateWithinLast14Days(recentDate);

      expect(result).toBe(true);
    });

    it('should return false for date older than 14 days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 20);

      const result = service.isDateWithinLast14Days(oldDate);

      expect(result).toBe(false);
    });

    it('should return false for invalid date', () => {
      const invalidDate = new Date('invalid');

      const result = service.isDateWithinLast14Days(invalidDate);

      expect(result).toBe(false);
    });

    it('should return true for today', () => {
      const today = new Date();

      const result = service.isDateWithinLast14Days(today);

      expect(result).toBe(true);
    });

    it('should return true for date exactly 14 days ago', () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const result = service.isDateWithinLast14Days(fourteenDaysAgo);

      expect(result).toBe(true);
    });
  });

  describe('getLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: SourceDataType.Point,
      appId: 'test-app',
    };

    it('should throw RpcException when riverBasin is not provided', async () => {
      const payloadWithoutBasin = { ...mockPayload, riverBasin: undefined };
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await expect(
        service.getLevels(payloadWithoutBasin, SourceType.WATER_LEVEL),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'River basin is not passed in the payload',
      );
    });

    it('should call getGfhWaterLevels for GFH source', async () => {
      jest.spyOn(service, 'getGfhWaterLevels').mockResolvedValue({} as any);

      const result = await service.getLevels(
        { ...mockPayload, source: DataSource.GFH },
        SourceType.WATER_LEVEL,
      );

      expect(service.getGfhWaterLevels).toHaveBeenCalledWith({
        ...mockPayload,
        source: DataSource.GFH,
      });

      expect(result).toEqual({});
    });

    it('should return undefined for non-DHM and non-GFH source', async () => {
      const result = await service.getLevels(
        { ...mockPayload, source: DataSource.GLOFAS },
        SourceType.WATER_LEVEL,
      );

      expect(result).toBeUndefined();
    });

    it('should throw RpcException when type is not provided for DHM', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await expect(
        service.getLevels(
          { ...mockPayload, source: DataSource.DHM },
          undefined as any,
        ),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Type is not passed in the payload',
      );
    });

    it('should return aggregated data for DHM source', async () => {
      const mockSourcesData = [
        {
          id: 1,
          info: { value: 10, series_id: 123 },
          type: SourceType.WATER_LEVEL,
          dataSource: DataSource.DHM,
          source: { riverBasin: 'test-basin', source: [DataSource.DHM] },
        },
        {
          id: 2,
          info: { value: 20, series_id: 234 },
          type: SourceType.WATER_LEVEL,
          dataSource: DataSource.DHM,
          source: { riverBasin: 'test-basin', source: [DataSource.DHM] },
        },
      ];

      mockPrismaService.sourcesData.findMany.mockResolvedValue(mockSourcesData);

      const result = await service.getLevels(
        { ...mockPayload, source: DataSource.DHM },
        SourceType.WATER_LEVEL,
      );

      expect(mockPrismaService.sourcesData.findMany).toHaveBeenCalledWith({
        where: {
          type: SourceType.WATER_LEVEL,
          dataSource: DataSource.DHM,
          source: { riverBasin: 'test-basin' },
        },
        include: {
          source: {
            select: { riverBasin: true, source: true },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      expect(result).toEqual({
        ...mockSourcesData[0],
        info: [
          { value: 10, series_id: 123 },
          { value: 20, series_id: 234 },
        ],
      });
    });

    it('should throw RpcException when no sourcesData found', async () => {
      mockPrismaService.sourcesData.findMany.mockResolvedValue([]);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(
        service.getLevels(
          { ...mockPayload, source: DataSource.DHM },
          SourceType.WATER_LEVEL,
        ),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        `No sourcesData found for river basin: test-basin, type: WATER_LEVEL, dataSource: DHM`,
      );
    });
  });

  describe('getGfhWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.GFH,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: SourceDataType.Point,
      appId: 'test-app',
    };

    beforeEach(() => {
      jest.spyOn(service, 'findGfhData').mockResolvedValue([]);
    });

    it('should return GFH water levels', async () => {
      const result = await service.getGfhWaterLevels(mockPayload);

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      expect(service.findGfhData).toHaveBeenCalledWith(
        'test-basin',
        dateString,
      );

      expect(result).toEqual([]);
    });
  });

  describe('findGfhData', () => {
    const mockGfhData = [
      {
        id: 1,
        info: { forecastDate: '2023-01-01', stationName: 'Station 1' },
      },
    ];

    beforeEach(() => {
      mockPrismaService.sourcesData.findMany.mockResolvedValue(mockGfhData);
    });

    it('should find GFH data by riverBasin and forecastDate', async () => {
      const result = await service.findGfhData('test-basin', '2023-01-01');

      expect(mockPrismaService.sourcesData.findMany).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: 'test-basin',
          },
          dataSource: DataSource.GFH,
          AND: [
            {
              OR: [
                {
                  info: {
                    path: ['info', 'forecastDate'],
                    equals: '2023-01-01',
                  },
                },
                {
                  info: {
                    path: ['forecastDate'],
                    equals: '2023-01-01',
                  },
                },
              ],
            },
          ],
        },
      });

      expect(result).toEqual(mockGfhData);
    });

    it('should find GFH data with stationName filter', async () => {
      const result = await service.findGfhData(
        'test-basin',
        '2023-01-01',
        'Station 1',
      );

      expect(mockPrismaService.sourcesData.findMany).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: 'test-basin',
          },
          dataSource: DataSource.GFH,
          AND: [
            {
              OR: [
                {
                  info: {
                    path: ['info', 'forecastDate'],
                    equals: '2023-01-01',
                  },
                },
                {
                  info: {
                    path: ['forecastDate'],
                    equals: '2023-01-01',
                  },
                },
              ],
            },
            {
              info: {
                path: ['stationName'],
                equals: 'Station 1',
              },
            },
          ],
        },
      });

      expect(result).toEqual(mockGfhData);
    });
  });

  describe('isToday', () => {
    it('should return true for dates within today', () => {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const result = service.isToday(startOfToday, endOfToday);

      expect(result).toBe(true);
    });

    it('should return false for dates outside today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = service.isToday(yesterday, tomorrow);

      expect(result).toBe(false);
    });
  });

  describe('getOneDhmSeriesWaterLevels', () => {
    const mockPayload: GetDhmSingleSeriesDto = {
      from: new Date(),
      to: new Date(),
      period: SourceDataType.Point,
      seriesId: 12345,
      riverBasin: 'test-basin',
    };

    it('should return data from database when isToday and period is Point', async () => {
      const mockData = {
        id: 1,
        info: { value: 10 },
        type: SourceType.WATER_LEVEL,
        dataSource: DataSource.DHM,
        source: { riverBasin: 'test-basin', source: [DataSource.DHM] },
      };

      mockPrismaService.sourcesData.findFirst.mockResolvedValue(mockData);
      jest.spyOn(service, 'isToday').mockReturnValue(true);

      const result = await service.getOneDhmSeriesWaterLevels(mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          type: SourceType.WATER_LEVEL,
          dataSource: DataSource.DHM,
          source: { riverBasin: 'test-basin' },
        },
        include: {
          source: {
            select: { riverBasin: true, source: true },
          },
        },
      });

      expect(result).toEqual(mockData);
    });

    it('should call scheduleSourcesDataService when isToday is true but period is not Point', async () => {
      const payloadWithNonPointPeriod = {
        ...mockPayload,
        period: SourceDataType.Daily,
      };

      const mockResult = { stationDetail: {}, data: [] };
      mockScheduleSourcesDataService.getDhmWaterLevels.mockResolvedValue(
        mockResult,
      );

      jest.spyOn(service, 'isToday').mockReturnValue(true);
      jest.spyOn(service, 'isDateWithinLast14Days').mockReturnValue(true);

      const result = await service.getOneDhmSeriesWaterLevels(
        payloadWithNonPointPeriod,
      );

      expect(
        mockScheduleSourcesDataService.getDhmWaterLevels,
      ).toHaveBeenCalledWith(
        payloadWithNonPointPeriod.from,
        SourceDataType.Daily,
        payloadWithNonPointPeriod.seriesId,
      );

      expect(result).toEqual({ info: mockResult });
    });

    it('should throw RpcException when dates are not within last 14 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 20);

      const payloadWithOldDates = {
        ...mockPayload,
        from: oldDate,
        to: oldDate,
        period: SourceDataType.Daily,
      };

      jest.spyOn(service, 'isToday').mockReturnValue(false);
      jest.spyOn(service, 'isDateWithinLast14Days').mockReturnValue(false);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(
        service.getOneDhmSeriesWaterLevels(payloadWithOldDates),
      ).rejects.toThrow(RpcException);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Dates must be within the last 14 days',
      );
    });

    it('should call scheduleSourcesDataService when dates are within last 14 days', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);

      const payloadWithRecentDates = {
        ...mockPayload,
        from: recentDate,
        to: recentDate,
        period: SourceDataType.Daily,
      };

      const mockResult = { stationDetail: {}, data: [] };
      mockScheduleSourcesDataService.getDhmWaterLevels.mockResolvedValue(
        mockResult,
      );

      jest.spyOn(service, 'isToday').mockReturnValue(false);
      jest.spyOn(service, 'isDateWithinLast14Days').mockReturnValue(true);

      const result = await service.getOneDhmSeriesWaterLevels(
        payloadWithRecentDates,
      );

      expect(
        mockScheduleSourcesDataService.getDhmWaterLevels,
      ).toHaveBeenCalledWith(
        recentDate,
        SourceDataType.Daily,
        payloadWithRecentDates.seriesId,
      );

      expect(result).toEqual({ info: mockResult });
    });
  });
});
