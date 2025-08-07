import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@rumsan/prisma';
import { SourcesDataService } from './sources-data.service';
import { DhmService } from './dhm.service';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { PaginationDto } from 'src/common/dto';
import { GetSouceDataDto, SourceDataType } from './dto/get-source-data';
import { DataSource, SourceType } from '@prisma/client';

jest.mock('@rumsan/settings', () => ({
  SettingsService: {
    get: jest.fn().mockReturnValue({
      DHM: [
        {
          RAINFALL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29785, 29608, 5726, 29689],
          },
          WATER_LEVEL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29089],
          },
        },
      ],
      GLOFAS: [
        {
          LOCATION: 'Doda river at East-West Highway',
          URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
          I: '227', //coordinate for station
          J: '67',
          TIMESTRING: '2023-10-01T00:00:00Z',
        },
      ],
      GFH: [
        {
          STATION_NAME: 'Doda river at East-West Highway',
          RIVER_NAME: 'doda',
          STATION_ID: 'G10165',
          POINT_ID: 'SI002576',
          LISFLOOD_DRAINAGE_AREA: 432,
          'LISFLOOD_X_(DEG)': 80.425,
          'LISFLOOD_Y_[DEG]': 28.875,
          LATITUDE: 28.853,
          LONGITUDE: 80.434,
        },
      ],
    }),
  },
}));

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
      count: jest.fn(),
    },
    source: {
      findFirst: jest.fn(),
      connectOrCreate: jest.fn(),
    },
  };

  const mockDhmService = {
    getRiverStations: jest.fn(),
    getRiverStationData: jest.fn(),
    getData: jest.fn(),
    saveDataInDhm: jest.fn(),
    getDhmRiverWatchData: jest.fn(),
    getDhmRainfallWatchData: jest.fn(),
    normalizeDhmRiverAndRainfallWatchData: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
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
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<SourcesDataService>(SourcesDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      await expect(service.create(mockCreateDto)).rejects.toThrow(error);

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

    it('should return paginated results', async () => {
      const mockSourceData = [{ id: 1, info: { test: 'data' } }];
      
      mockPrismaService.sourcesData.findMany.mockResolvedValue(mockSourceData);
      mockPrismaService.sourcesData.count.mockResolvedValue(1);

      const result = await service.findAll('test-app', mockPaginationDto);

      expect(result.data).toEqual(mockSourceData);
      expect(result.meta.total).toBe(1);
    });

    it('should throw RpcException when fetching fails', async () => {
      const error = new Error('Database error');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      mockPrismaService.sourcesData.count.mockRejectedValue(error);

      await expect(
        service.findAll('test-app', mockPaginationDto),
      ).rejects.toThrow(error);

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

      await expect(service.findOne(mockId)).rejects.toThrow(error);

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

      await expect(service.update(mockUpdateDto)).rejects.toThrow(error);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error while updating source data info',
        error,
      );
    });
  });

  describe('getSourceFromAppId', () => {
    const mockAppId = 'test-app';
    const mockSourceData = { id: 1, riverBasin: 'test-basin' };

    beforeEach(() => {
      mockPrismaService.source.findFirst.mockResolvedValue(mockSourceData);
    });

    it('should return source data by app id', async () => {
      const result = await service.getSourceFromAppId(mockAppId);

      expect(mockPrismaService.source.findFirst).toHaveBeenCalledWith({
        where: {
          Phase: {
            some: {
              Activity: {
                some: {
                  app: mockAppId,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockSourceData);
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

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return rainfall levels', async () => {
      const result = await service.getRainfallLevels(mockPayload);

      expect(service.getLevels).toHaveBeenCalledWith(
        mockPayload,
        SourceType.RAINFALL,
      );
      expect(result).toEqual({});
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
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      const result = service.isToday(today, today);
      expect(result).toBe(true);
    });

    it('should return false for different dates', () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = service.isToday(yesterday, today);
      expect(result).toBe(false);
    });
  });

  describe('getGlofasWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.GLOFAS,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: SourceDataType.Point,
      appId: 'test-app',
    };

    beforeEach(() => {
      mockPrismaService.sourcesData.findFirst.mockResolvedValue({
        id: 1,
        info: { test: 'data' },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return Glofas water levels', async () => {
      const result = await service.getGlofasWaterLevels(mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: 'test-basin',
          },
          info: {
            path: ['forecastDate'],
            equals: expect.any(String),
          },
        },
      });
      expect(result).toEqual({ id: 1, info: { test: 'data' } });
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
      mockPrismaService.sourcesData.findFirst.mockResolvedValue({
        id: 1,
        info: { test: 'data' },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return GFH water levels', async () => {
      const result = await service.getGfhWaterLevels(mockPayload);

      expect(mockPrismaService.sourcesData.findFirst).toHaveBeenCalledWith({
        where: {
          source: {
            riverBasin: 'test-basin',
          },
          dataSource: DataSource.GFH,
          info: {
            path: ['forecastDate'],
            equals: expect.any(String),
          },
        },
      });
      expect(result).toEqual({ id: 1, info: { test: 'data' } });
    });
  });
});
