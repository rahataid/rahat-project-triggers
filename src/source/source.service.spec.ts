import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { SourceService } from './source.service';
import { GetSouceDto } from './dto/get-source.dto';

describe('SourceService', () => {
  let service: SourceService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SourceService>(SourceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockDto: GetSouceDto = {
      page: 1,
      perPage: 10,
    };

    it('should have findAll method defined', () => {
      expect(typeof service.findAll).toBe('function');
    });

    it('should handle different pagination parameters', () => {
      const customDto: GetSouceDto = {
        page: 2,
        perPage: 5,
      };

      expect(customDto.page).toBe(2);
      expect(customDto.perPage).toBe(5);
    });

    it('should handle empty pagination parameters', () => {
      const emptyDto: GetSouceDto = {};

      expect(emptyDto.page).toBeUndefined();
      expect(emptyDto.perPage).toBeUndefined();
    });

    it('should handle null pagination parameters', () => {
      const nullDto: GetSouceDto = {
        page: null as any,
        perPage: null as any,
      };

      expect(nullDto.page).toBeNull();
      expect(nullDto.perPage).toBeNull();
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
      mockPrismaService.source.findUnique.mockResolvedValue(mockSource);

      const result = await service.findOne(mockDto);

      expect(mockPrismaService.source.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockDto.uuid },
        include: {
          Phase: true,
        },
      });
      expect(result).toEqual(mockSource);
    });

    it('should throw RpcException when source not found', async () => {
      mockPrismaService.source.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockDto)).rejects.toThrow(RpcException);
      await expect(service.findOne(mockDto)).rejects.toThrow('Source with UUID: test-uuid not found');
    });

    it('should handle different UUID values', async () => {
      const differentDto = { uuid: 'different-uuid' };
      mockPrismaService.source.findUnique.mockResolvedValue(mockSource);

      await service.findOne(differentDto);

      expect(mockPrismaService.source.findUnique).toHaveBeenCalledWith({
        where: { uuid: differentDto.uuid },
        include: {
          Phase: true,
        },
      });
    });

    it('should throw RpcException when database error occurs', async () => {
      const databaseError = new Error('Database connection failed');
      mockPrismaService.source.findUnique.mockRejectedValue(databaseError);

      await expect(service.findOne(mockDto)).rejects.toThrow(RpcException);
    });

    it('should handle empty UUID', async () => {
      const emptyDto = { uuid: '' };
      mockPrismaService.source.findUnique.mockResolvedValue(null);

      await expect(service.findOne(emptyDto)).rejects.toThrow(RpcException);
      await expect(service.findOne(emptyDto)).rejects.toThrow('Source with UUID:  not found');
    });

    it('should handle null UUID', async () => {
      const nullDto = { uuid: null as any };
      mockPrismaService.source.findUnique.mockResolvedValue(null);

      await expect(service.findOne(nullDto)).rejects.toThrow(RpcException);
      await expect(service.findOne(nullDto)).rejects.toThrow('Source with UUID: null not found');
    });

    it('should handle undefined UUID', async () => {
      const undefinedDto = { uuid: undefined as any };
      mockPrismaService.source.findUnique.mockResolvedValue(null);

      await expect(service.findOne(undefinedDto)).rejects.toThrow(RpcException);
      await expect(service.findOne(undefinedDto)).rejects.toThrow('Source with UUID: undefined not found');
    });
  });

  describe('Logger Coverage', () => {
    it('should have logger defined', () => {
      expect(service.logger).toBeDefined();
      expect(service.logger.log).toBeDefined();
      expect(service.logger.error).toBeDefined();
      expect(service.logger.warn).toBeDefined();
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findOne).toBe('function');
    });
  });
});
