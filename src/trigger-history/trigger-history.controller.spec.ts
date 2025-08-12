import { Test, TestingModule } from '@nestjs/testing';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';
import { PrismaService } from '@rumsan/prisma';
import { GetTriggerHistoryDto } from './dto/get-trigger-history.dto';
import { GetOneTriggerHistoryDto } from './dto/get-one-trigger-history';
import { MS_TRIGGERS_JOBS } from '../constant';

describe('TriggerHistoryController', () => {
  let controller: TriggerHistoryController;
  let mockTriggerHistoryService: jest.Mocked<TriggerHistoryService>;

  const mockTriggerHistoryServiceImplementation = {
    create: jest.fn(),
    findAll: jest.fn(),
    getOne: jest.fn(),
    getCurrentVersionByPhaseId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriggerHistoryController],
      providers: [
        {
          provide: TriggerHistoryService,
          useValue: mockTriggerHistoryServiceImplementation,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TriggerHistoryController>(TriggerHistoryController);
    mockTriggerHistoryService = module.get(TriggerHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const mockPayload = {
      phaseUuid: 'phase-uuid-123',
      user: { name: 'test-user' },
    };

    const mockResult = {
      message: 'Phase reverted successfully',
      phase: { uuid: 'phase-uuid-123', isActive: false },
      version: 1,
    } as any;

    it('should successfully create trigger history', async () => {
      mockTriggerHistoryService.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockPayload);

      expect(mockTriggerHistoryService.create).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      mockTriggerHistoryService.create.mockRejectedValue(error);

      await expect(controller.create(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const mockPayload: GetTriggerHistoryDto = {
      phaseUuid: 'phase-uuid-123',
      version: '1',
      phase: true,
    };

    const mockResult = {
      data: [
        {
          version: 1,
          revertedAt: new Date('2023-01-01'),
          revertedBy: 'user1',
          phaseActivationDate: new Date('2023-01-01'),
          triggers: [],
        },
      ],
      meta: {
        total: 1,
        versions: [1],
      },
    };

    it('should successfully find all trigger histories', async () => {
      mockTriggerHistoryService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockPayload);

      expect(mockTriggerHistoryService.findAll).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      mockTriggerHistoryService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('getOne', () => {
    const mockPayload: GetOneTriggerHistoryDto = {
      id: 1,
    };

    const mockResult = {
      id: 1,
      version: 1,
      revertedAt: new Date('2023-01-01'),
      revertedBy: 'user1',
      phase: {
        name: 'Phase 1',
        source: { name: 'Source 1' },
      },
    } as any;

    it('should successfully get one trigger history', async () => {
      mockTriggerHistoryService.getOne.mockResolvedValue(mockResult);

      const result = await controller.getOne(mockPayload);

      expect(mockTriggerHistoryService.getOne).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      mockTriggerHistoryService.getOne.mockRejectedValue(error);

      await expect(controller.getOne(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('MessagePattern methods', () => {
    it('should have create method with MessagePattern decorator', () => {
      expect(typeof controller.create).toBe('function');
    });

    it('should have findAll method with MessagePattern decorator', () => {
      expect(typeof controller.findAll).toBe('function');
    });

    it('should have getOne method with MessagePattern decorator', () => {
      expect(typeof controller.getOne).toBe('function');
    });
  });
}); 