import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { PrismaService, DataSource } from '@lib/database';
import { SourcesDataController } from './sources-data.controller';
import { SourcesDataService } from './sources-data.service';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { GetSouceDataDto } from './dto/get-source-data';

describe('SourcesDataController', () => {
  let controller: SourcesDataController;
  let sourceDataService: SourcesDataService;

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
      findFirst: jest.fn(),
    },
    trigger: {
      findUnique: jest.fn(),
    },
  };

  const mockSourceDataService = {
    getWaterLevels: jest.fn(),
    getRainfallLevels: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourcesDataController],
      providers: [
        {
          provide: SourcesDataService,
          useValue: mockSourceDataService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    controller = module.get<SourcesDataController>(SourcesDataController);
    sourceDataService = module.get<SourcesDataService>(SourcesDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDhmWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: 'POINT' as any,
      appId: 'test-app',
    };

    const mockWaterLevels = { data: 'water-levels' };

    beforeEach(() => {
      mockSourceDataService.getWaterLevels.mockResolvedValue(mockWaterLevels);
    });

    it('should return DHM water levels', async () => {
      const result = await controller.getDhmWaterLevels(mockPayload);

      expect(mockSourceDataService.getWaterLevels).toHaveBeenCalledWith({
        ...mockPayload,
        source: DataSource.DHM,
      });
      expect(result).toEqual(mockWaterLevels);
    });
  });

  describe('getGlofasWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.GLOFAS,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: 'POINT' as any,
      appId: 'test-app',
    };

    const mockWaterLevels = { data: 'glofas-water-levels' };

    beforeEach(() => {
      mockSourceDataService.getWaterLevels.mockResolvedValue(mockWaterLevels);
    });

    it('should return Glofas water levels', async () => {
      const result = await controller.getGlofasWaterLevels(mockPayload);

      expect(mockSourceDataService.getWaterLevels).toHaveBeenCalledWith({
        ...mockPayload,
        source: DataSource.GLOFAS,
      });
      expect(result).toEqual(mockWaterLevels);
    });
  });

  describe('getGfhWaterLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.GFH,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: 'POINT' as any,
      appId: 'test-app',
    };

    const mockWaterLevels = { data: 'gfh-water-levels' };

    beforeEach(() => {
      mockSourceDataService.getWaterLevels.mockResolvedValue(mockWaterLevels);
    });

    it('should return GFH water levels', async () => {
      const result = await controller.getGfhWaterLevels(mockPayload);

      expect(mockSourceDataService.getWaterLevels).toHaveBeenCalledWith({
        ...mockPayload,
        source: DataSource.GFH,
      });
      expect(result).toEqual(mockWaterLevels);
    });
  });

  describe('getDhmRainfallLevels', () => {
    const mockPayload: GetSouceDataDto = {
      source: DataSource.DHM,
      riverBasin: 'test-basin',
      from: new Date('2023-01-01'),
      to: new Date('2023-01-31'),
      type: 'POINT' as any,
      appId: 'test-app',
    };

    const mockRainfallLevels = { data: 'rainfall-levels' };

    beforeEach(() => {
      mockSourceDataService.getRainfallLevels.mockResolvedValue(
        mockRainfallLevels,
      );
    });

    it('should return DHM rainfall levels', async () => {
      const result = await controller.getDhmRainfallLevels(mockPayload);

      expect(mockSourceDataService.getRainfallLevels).toHaveBeenCalledWith({
        ...mockPayload,
        source: DataSource.DHM,
      });
      expect(result).toEqual(mockRainfallLevels);
    });
  });

  describe('MessagePattern decorators', () => {
    it('should have correct message patterns', () => {
      expect(MS_TRIGGERS_JOBS.WATER_LEVELS.GET_DHM).toBeDefined();
      expect(MS_TRIGGERS_JOBS.WATER_LEVELS.GET_GLOFAS).toBeDefined();
      expect(MS_TRIGGERS_JOBS.WATER_LEVELS.GET_GFH).toBeDefined();
      expect(MS_TRIGGERS_JOBS.RAINFALL_LEVELS.GET_DHM).toBeDefined();
    });
  });

  describe('Dependency Injection', () => {
    it('should inject SourcesDataService correctly', () => {
      expect(sourceDataService).toBeDefined();
      expect(sourceDataService).toBe(mockSourceDataService);
    });
  });
});
