import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@rumsan/prisma';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto, ListCategoryDto } from './dto';
import { MS_TRIGGERS_JOBS } from 'src/constant';

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockCategoryService: jest.Mocked<CategoryService>;

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
      controllers: [CategoryController],
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceImplementation,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    mockCategoryService = module.get(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('add', () => {
    const mockCreateCategoryDto: CreateCategoryDto = {
      name: 'Test Category',
      appId: 'app-id',
    };

    it('should successfully add a category', async () => {
      const mockCategory: any = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        app: 'app-id',
      };

      jest.spyOn(mockCategoryService, 'create').mockResolvedValue(mockCategory);

      const result = await controller.add(mockCreateCategoryDto);

      expect(mockCategoryService.create).toHaveBeenCalledWith(
        'app-id',
        { name: 'Test Category' }
      );
      expect(result).toEqual(mockCategory);
    });

    it('should handle add with different payload', async () => {
      const differentDto: CreateCategoryDto = {
        name: 'Different Category',
        appId: 'different-app-id',
      };

      const mockCategory: any = {
        id: 2,
        uuid: 'category-uuid-2',
        name: 'Different Category',
        app: 'different-app-id',
      };

      jest.spyOn(mockCategoryService, 'create').mockResolvedValue(mockCategory);

      const result = await controller.add(differentDto);

      expect(mockCategoryService.create).toHaveBeenCalledWith(
        'different-app-id',
        { name: 'Different Category' }
      );
      expect(result).toEqual(mockCategory);
    });

    it('should handle add without appId in payload', async () => {
      const dtoWithoutAppId: CreateCategoryDto = {
        name: 'Category Without AppId',
      };

      const mockCategory: any = {
        id: 3,
        uuid: 'category-uuid-3',
        name: 'Category Without AppId',
        app: undefined,
      };

      jest.spyOn(mockCategoryService, 'create').mockResolvedValue(mockCategory);

      const result = await controller.add(dtoWithoutAppId);

      expect(mockCategoryService.create).toHaveBeenCalledWith(
        undefined,
        { name: 'Category Without AppId' }
      );
      expect(result).toEqual(mockCategory);
    });
  });

  describe('getAll', () => {
    const mockListCategoryDto: ListCategoryDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      sort: 'createdAt',
      order: 'desc',
    };

    it('should successfully get all categories', async () => {
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

      const mockPaginatedResult: any = {
        data: mockCategories,
        meta: {
          total: 2,
          page: 1,
          perPage: 10,
        },
      };

      jest.spyOn(mockCategoryService, 'findAll').mockResolvedValue(mockPaginatedResult);

      const result = await controller.getAll(mockListCategoryDto);

      expect(mockCategoryService.findAll).toHaveBeenCalledWith(mockListCategoryDto);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle getAll with name filter', async () => {
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

      const mockPaginatedResult: any = {
        data: mockCategories,
        meta: {
          total: 1,
          page: 1,
          perPage: 10,
        },
      };

      jest.spyOn(mockCategoryService, 'findAll').mockResolvedValue(mockPaginatedResult);

      const result = await controller.getAll(dtoWithName);

      expect(mockCategoryService.findAll).toHaveBeenCalledWith(dtoWithName);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle getAll with minimal payload', async () => {
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

      const mockPaginatedResult: any = {
        data: mockCategories,
        meta: {
          total: 1,
          page: 1,
          perPage: 10,
        },
      };

      jest.spyOn(mockCategoryService, 'findAll').mockResolvedValue(mockPaginatedResult);

      const result = await controller.getAll(minimalDto);

      expect(mockCategoryService.findAll).toHaveBeenCalledWith(minimalDto);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('remove', () => {
    const mockPayload = {
      uuid: 'category-uuid',
    };

    it('should successfully remove a category', async () => {
      const mockDeletedCategory: any = {
        id: 1,
        uuid: 'category-uuid',
        name: 'Test Category',
        isDeleted: true,
      };

      jest.spyOn(mockCategoryService, 'remove').mockResolvedValue(mockDeletedCategory);

      const result = await controller.remove(mockPayload);

      expect(mockCategoryService.remove).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockDeletedCategory);
    });

    it('should handle remove with different UUID', async () => {
      const differentPayload = {
        uuid: 'different-uuid',
      };

      const mockDeletedCategory: any = {
        id: 2,
        uuid: 'different-uuid',
        name: 'Different Category',
        isDeleted: true,
      };

      jest.spyOn(mockCategoryService, 'remove').mockResolvedValue(mockDeletedCategory);

      const result = await controller.remove(differentPayload);

      expect(mockCategoryService.remove).toHaveBeenCalledWith(differentPayload);
      expect(result).toEqual(mockDeletedCategory);
    });
  });
});
