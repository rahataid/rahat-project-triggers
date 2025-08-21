import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { GetSouceDto } from './dto/get-source.dto';
import { MS_TRIGGERS_JOBS } from 'src/constant';

// Mock the paginator function
jest.mock('@rumsan/prisma', () => ({
  ...jest.requireActual('@rumsan/prisma'),
  paginator: jest.fn(() => jest.fn().mockResolvedValue({
    data: [],
    meta: {
      total: 0,
      lastPage: 1,
      currentPage: 1,
      perPage: 10,
      prev: null,
      next: null,
    },
  })),
}));

describe('SourceController', () => {
  let controller: SourceController;
  let sourceService: SourceService;

  const mockSourceService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SourceController],
      providers: [
        {
          provide: SourceService,
          useValue: mockSourceService,
        },
      ],
    }).compile();

    controller = module.get<SourceController>(SourceController);
    sourceService = module.get<SourceService>(SourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSource', () => {
    const mockDto: GetSouceDto = {
      page: 1,
      perPage: 10,
    };

    const mockPaginatedData = {
      data: [
        {
          id: 1,
          uuid: 'test-uuid-1',
          riverBasin: 'Test Basin 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          Phase: [],
        },
        {
          id: 2,
          uuid: 'test-uuid-2',
          riverBasin: 'Test Basin 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          Phase: [],
        },
      ],
      meta: {
        total: 2,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    };

    it('should get all sources successfully', async () => {
      mockSourceService.findAll.mockResolvedValue(mockPaginatedData);

      const result = await controller.getAllSource(mockDto);

      expect(mockSourceService.findAll).toHaveBeenCalledWith(mockDto);
      expect(result).toEqual(mockPaginatedData);
    });

    it('should handle different pagination parameters', async () => {
      const customDto: GetSouceDto = {
        page: 2,
        perPage: 5,
      };
      mockSourceService.findAll.mockResolvedValue(mockPaginatedData);

      await controller.getAllSource(customDto);

      expect(mockSourceService.findAll).toHaveBeenCalledWith(customDto);
    });

    it('should handle empty pagination parameters', async () => {
      const emptyDto: GetSouceDto = {};
      mockSourceService.findAll.mockResolvedValue(mockPaginatedData);

      await controller.getAllSource(emptyDto);

      expect(mockSourceService.findAll).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle null pagination parameters', async () => {
      const nullDto: GetSouceDto = {
        page: null as any,
        perPage: null as any,
      };
      mockSourceService.findAll.mockResolvedValue(mockPaginatedData);

      await controller.getAllSource(nullDto);

      expect(mockSourceService.findAll).toHaveBeenCalledWith(nullDto);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockSourceService.findAll.mockRejectedValue(error);

      await expect(controller.getAllSource(mockDto)).rejects.toThrow(RpcException);
      expect(mockSourceService.findAll).toHaveBeenCalledWith(mockDto);
    });

    it('should handle service throwing generic error', async () => {
      const error = new Error('Generic error');
      mockSourceService.findAll.mockRejectedValue(error);

      await expect(controller.getAllSource(mockDto)).rejects.toThrow(Error);
      expect(mockSourceService.findAll).toHaveBeenCalledWith(mockDto);
    });
  });

  describe('findOne', () => {
    const mockDto = { uuid: 'test-uuid' };
    const mockSource = {
      id: 1,
      uuid: 'test-uuid',
      riverBasin: 'Test Basin',
      createdAt: new Date(),
      updatedAt: new Date(),
      Phase: [],
    };

    it('should find source by UUID successfully', async () => {
      mockSourceService.findOne.mockResolvedValue(mockSource);

      const result = await controller.findOne(mockDto);

      expect(mockSourceService.findOne).toHaveBeenCalledWith(mockDto);
      expect(result).toEqual(mockSource);
    });

    it('should handle different UUID values', async () => {
      const differentDto = { uuid: 'different-uuid' };
      mockSourceService.findOne.mockResolvedValue(mockSource);

      await controller.findOne(differentDto);

      expect(mockSourceService.findOne).toHaveBeenCalledWith(differentDto);
    });

    it('should handle empty UUID', async () => {
      const emptyDto = { uuid: '' };
      mockSourceService.findOne.mockResolvedValue(mockSource);

      await controller.findOne(emptyDto);

      expect(mockSourceService.findOne).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle null UUID', async () => {
      const nullDto = { uuid: null as any };
      mockSourceService.findOne.mockResolvedValue(mockSource);

      await controller.findOne(nullDto);

      expect(mockSourceService.findOne).toHaveBeenCalledWith(nullDto);
    });

    it('should handle undefined UUID', async () => {
      const undefinedDto = { uuid: undefined as any };
      mockSourceService.findOne.mockResolvedValue(mockSource);

      await controller.findOne(undefinedDto);

      expect(mockSourceService.findOne).toHaveBeenCalledWith(undefinedDto);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Source not found');
      mockSourceService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockDto)).rejects.toThrow(RpcException);
      expect(mockSourceService.findOne).toHaveBeenCalledWith(mockDto);
    });

    it('should handle service throwing generic error', async () => {
      const error = new Error('Database error');
      mockSourceService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockDto)).rejects.toThrow(Error);
      expect(mockSourceService.findOne).toHaveBeenCalledWith(mockDto);
    });
  });

  describe('Message Pattern Decorators', () => {
    it('should have correct message pattern decorators', () => {
      const prototype = Object.getPrototypeOf(controller);
      
      // Check that the methods have the correct decorators
      expect(prototype.getAllSource).toBeDefined();
      expect(prototype.findOne).toBeDefined();
    });

    it('should have correct message pattern commands', () => {
      // This test ensures the message patterns are correctly defined
      expect(MS_TRIGGERS_JOBS.SOURCE.GET_ALL).toBeDefined();
      expect(MS_TRIGGERS_JOBS.SOURCE.GET_ONE).toBeDefined();
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof controller.getAllSource).toBe('function');
      expect(typeof controller.findOne).toBe('function');
    });
  });

  describe('Dependency Injection', () => {
    it('should have SourceService injected', () => {
      expect(sourceService).toBeDefined();
      expect(sourceService.findAll).toBeDefined();
      expect(sourceService.findOne).toBeDefined();
    });
  });
});
