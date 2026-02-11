import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@lib/database';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

describe('LibraryController', () => {
  let controller: LibraryController;
  let libraryService: jest.Mocked<LibraryService>;

  const mockLibraryService = {
    getActivityTemplates: jest.fn(),
    getActivityTemplateById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        {
          provide: LibraryService,
          useValue: mockLibraryService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<LibraryController>(LibraryController);
    libraryService = module.get(LibraryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActivityTemplates', () => {
    const mockPayload = {
      phase: 'Preparedness',
      hasCommunication: true,
      page: 1,
      perPage: 10,
    };

    const mockResult = {
      data: [
        {
          uuid: 'test-uuid',
          title: 'Test Template',
          isTemplate: true,
          source: 'default',
        },
      ],
      meta: {
        total: 1,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    };

    it('should return activity templates', async () => {
      libraryService.getActivityTemplates.mockResolvedValue(mockResult);

      const result = await controller.getActivityTemplates(mockPayload);

      expect(libraryService.getActivityTemplates).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      libraryService.getActivityTemplates.mockRejectedValue(error);

      await expect(
        controller.getActivityTemplates(mockPayload),
      ).rejects.toThrow(error);
    });
  });

  describe('getActivityTemplateById', () => {
    const mockPayload = { uuid: 'test-uuid', appId: 'app-123' };

    const mockResult = {
      uuid: 'test-uuid',
      title: 'Test Template',
      isTemplate: true,
    };

    it('should return a single activity template', async () => {
      libraryService.getActivityTemplateById.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.getActivityTemplateById(mockPayload);

      expect(libraryService.getActivityTemplateById).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service error', async () => {
      const error = new Error('Not found');
      libraryService.getActivityTemplateById.mockRejectedValue(error);

      await expect(
        controller.getActivityTemplateById(mockPayload),
      ).rejects.toThrow(error);
    });
  });
});
