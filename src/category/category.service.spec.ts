import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@rumsan/prisma';
import { CategoryService } from './category.service';
import { CreateCategoryDto, ListCategoryDto, UpdateCategoryDto } from './dto';

describe('CategoryService', () => {
  let service: CategoryService;
  let mockPrismaService: any;

  const mockPrismaServiceImplementation = {
    activityCategory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceImplementation,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    mockPrismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateCategoryDto: CreateCategoryDto = {
      name: 'Test Category',
      appId: 'app-id',
    };

    it('should successfully create a category', async () => {
      const mockCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        app: 'app-id',
      };

      mockPrismaService.activityCategory.create.mockResolvedValue(mockCategory);

      const result = await service.create('app-id', mockCreateCategoryDto);

      expect(mockPrismaService.activityCategory.create).toHaveBeenCalledWith({
        data: {
          ...mockCreateCategoryDto,
          app: 'app-id',
        },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should create category without appId in DTO', async () => {
      const dtoWithoutAppId: CreateCategoryDto = {
        name: 'Test Category',
      };

      const mockCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        app: 'app-id',
      };

      mockPrismaService.activityCategory.create.mockResolvedValue(mockCategory);

      const result = await service.create('app-id', dtoWithoutAppId);

      expect(mockPrismaService.activityCategory.create).toHaveBeenCalledWith({
        data: {
          ...dtoWithoutAppId,
          app: 'app-id',
        },
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    const mockListCategoryDto: ListCategoryDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      sort: 'createdAt',
      order: 'desc',
    };

    it('should successfully find all categories with pagination', async () => {
      const mockCategories = [
        {
          id: 1,
          uuid: 'category-uuid-1',
          name: 'Category 1',
        },
        {
          id: 2,
          uuid: 'category-uuid-2',
          name: 'Category 2',
        },
      ];

      const mockPaginatedResult = {
        data: mockCategories,
        meta: {
          total: 2,
          page: 1,
          perPage: 10,
        },
      };

      mockPrismaService.activityCategory.findMany.mockResolvedValue(mockCategories);
      mockPrismaService.activityCategory.count.mockResolvedValue(2);

      const result = await service.findAll(mockListCategoryDto);

      expect(mockPrismaService.activityCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            app: 'app-id',
            isDeleted: false,
          },
        }),
      );
      expect(result).toBeDefined();
    });

    it('should find categories with name filter', async () => {
      const dtoWithName: ListCategoryDto = {
        ...mockListCategoryDto,
        name: 'Test',
      };

      const mockCategories = [
        {
          id: 1,
          uuid: 'category-uuid-1',
          name: 'Test Category',
        },
      ];

      mockPrismaService.activityCategory.findMany.mockResolvedValue(mockCategories);
      mockPrismaService.activityCategory.count.mockResolvedValue(1);

      await service.findAll(dtoWithName);

      expect(mockPrismaService.activityCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            app: 'app-id',
            isDeleted: false,
            name: { contains: 'Test', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should find categories without optional filters', async () => {
      const minimalDto: ListCategoryDto = {
        appId: 'app-id',
        page: 1,
        perPage: 10,
        sort: 'createdAt',
        order: 'asc',
      };

      const mockCategories = [
        {
          id: 1,
          uuid: 'category-uuid-1',
          name: 'Category 1',
        },
      ];

      mockPrismaService.activityCategory.findMany.mockResolvedValue(mockCategories);
      mockPrismaService.activityCategory.count.mockResolvedValue(1);

      const result = await service.findAll(minimalDto);

      expect(mockPrismaService.activityCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            app: 'app-id',
            isDeleted: false,
          },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    const mockUuid = 'category-uuid';

    it('should successfully find a category by UUID', async () => {
      const mockCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        app: 'app-id',
      };

      mockPrismaService.activityCategory.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne(mockUuid);

      expect(mockPrismaService.activityCategory.findUnique).toHaveBeenCalledWith({
        where: {
          uuid: mockUuid,
        },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category not found', async () => {
      mockPrismaService.activityCategory.findUnique.mockResolvedValue(null);

      const result = await service.findOne(mockUuid);

      expect(mockPrismaService.activityCategory.findUnique).toHaveBeenCalledWith({
        where: {
          uuid: mockUuid,
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const mockUuid = 'category-uuid';
    const mockUpdateCategoryDto: UpdateCategoryDto = {
      name: 'Updated Category',
    };

    it('should successfully update a category', async () => {
      const mockUpdatedCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Updated Category',
        app: 'app-id',
      };

      mockPrismaService.activityCategory.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.update(mockUuid, mockUpdateCategoryDto);

      expect(mockPrismaService.activityCategory.update).toHaveBeenCalledWith({
        where: {
          uuid: mockUuid,
        },
        data: mockUpdateCategoryDto,
      });
      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should update category with partial data', async () => {
      const partialDto: UpdateCategoryDto = {
        name: 'Partial Update',
      };

      const mockUpdatedCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Partial Update',
        app: 'app-id',
      };

      mockPrismaService.activityCategory.update.mockResolvedValue(mockUpdatedCategory);

      const result = await service.update(mockUuid, partialDto);

      expect(mockPrismaService.activityCategory.update).toHaveBeenCalledWith({
        where: {
          uuid: mockUuid,
        },
        data: partialDto,
      });
      expect(result).toEqual(mockUpdatedCategory);
    });
  });

  describe('remove', () => {
    const mockPayload = {
      uuid: 'category-uuid',
    };

    it('should successfully soft delete a category', async () => {
      const mockDeletedCategory = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        isDeleted: true,
      };

      mockPrismaService.activityCategory.update.mockResolvedValue(mockDeletedCategory);

      const result = await service.remove(mockPayload);

      expect(mockPrismaService.activityCategory.update).toHaveBeenCalledWith({
        where: {
          uuid: mockPayload.uuid,
        },
        data: {
          isDeleted: true,
        },
      });
      expect(result).toEqual(mockDeletedCategory);
    });

    it('should handle remove with different UUID', async () => {
      const differentPayload = {
        uuid: 'different-uuid',
      };

      const mockDeletedCategory = {
        id: 2,
        uuid: 'different-uuid',
        name: 'Different Category',
        isDeleted: true,
      };

      mockPrismaService.activityCategory.update.mockResolvedValue(mockDeletedCategory);

      const result = await service.remove(differentPayload);

      expect(mockPrismaService.activityCategory.update).toHaveBeenCalledWith({
        where: {
          uuid: differentPayload.uuid,
        },
        data: {
          isDeleted: true,
        },
      });
      expect(result).toEqual(mockDeletedCategory);
    });
  });
});
