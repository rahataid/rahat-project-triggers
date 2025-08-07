import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { TriggerHistoryService } from './trigger-history.service';
import { GetTriggerHistoryDto } from './dto/get-trigger-history.dto';
import { GetOneTriggerHistoryDto } from './dto/get-one-trigger-history';

describe('TriggerHistoryService', () => {
  let service: TriggerHistoryService;
  let mockPrismaService: any;

  const mockPrismaServiceImplementation = {
    phase: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    triggerHistory: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    trigger: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerHistoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceImplementation,
        },
      ],
    }).compile();

    service = module.get<TriggerHistoryService>(TriggerHistoryService);
    mockPrismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockPayload = {
      phaseUuid: 'phase-uuid-123',
      user: { name: 'test-user' },
    };

    const mockPhase = {
      uuid: 'phase-uuid-123',
      canRevert: true,
      isActive: true,
      activatedAt: new Date('2023-01-01'),
      Trigger: [
        {
          id: 1,
          uuid: 'trigger-1',
          title: 'Trigger 1',
          isTriggered: true,
          triggeredAt: new Date('2023-01-01'),
          triggeredBy: 'user1',
        },
        {
          id: 2,
          uuid: 'trigger-2',
          title: 'Trigger 2',
          isTriggered: false,
        },
      ],
    };

    it('should successfully create trigger history', async () => {
      const mockTransactionResult = {
        message: 'Phase reverted successfully',
        phase: { uuid: 'phase-uuid-123', isActive: false },
        version: 1,
      };

      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhase);
      mockPrismaService.triggerHistory.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
      mockPrismaService.triggerHistory.createMany.mockResolvedValue({});
      mockPrismaService.trigger.updateMany.mockResolvedValue({});
      mockPrismaService.phase.update.mockResolvedValue(mockTransactionResult.phase);

      const result = await service.create(mockPayload);

      expect(mockPrismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.phaseUuid },
        include: { Trigger: true },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockTransactionResult);
    });

    it('should handle phase not found', async () => {
      mockPrismaService.phase.findUnique.mockResolvedValue(null);

      await expect(service.create(mockPayload)).rejects.toThrow(RpcException);
    });

    it('should handle phase cannot be reverted', async () => {
      const mockPhaseCannotRevert = { ...mockPhase, canRevert: false };
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhaseCannotRevert);

      await expect(service.create(mockPayload)).rejects.toThrow(RpcException);
    });

    it('should handle phase not active', async () => {
      const mockPhaseNotActive = { ...mockPhase, isActive: false };
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhaseNotActive);

      await expect(service.create(mockPayload)).rejects.toThrow(RpcException);
    });

    it('should handle transaction error', async () => {
      const error = new Error('Transaction failed');
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhase);
      mockPrismaService.triggerHistory.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(service.create(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('findAll', () => {
    const mockPayload: GetTriggerHistoryDto = {
      phaseUuid: 'phase-uuid-123',
      version: '1',
      phase: true,
    };

    const mockTriggerHistories = [
      {
        id: 1,
        version: 1,
        revertedAt: new Date('2023-01-01'),
        revertedBy: 'user1',
        phaseActivationDate: new Date('2023-01-01'),
        phase: { name: 'Phase 1' },
      },
      {
        id: 2,
        version: 1,
        revertedAt: new Date('2023-01-01'),
        revertedBy: 'user1',
        phaseActivationDate: new Date('2023-01-01'),
        phase: { name: 'Phase 1' },
      },
      {
        id: 3,
        version: 2,
        revertedAt: new Date('2023-01-02'),
        revertedBy: 'user2',
        phaseActivationDate: new Date('2023-01-02'),
        phase: { name: 'Phase 2' },
      },
    ];

    it('should successfully find all trigger histories', async () => {
      const expectedResult = {
        data: [
          {
            version: 2,
            revertedAt: new Date('2023-01-02'),
            revertedBy: 'user2',
            phaseActivationDate: new Date('2023-01-02'),
            triggers: [mockTriggerHistories[2]],
          },
          {
            version: 1,
            revertedAt: new Date('2023-01-01'),
            revertedBy: 'user1',
            phaseActivationDate: new Date('2023-01-01'),
            triggers: [mockTriggerHistories[0], mockTriggerHistories[1]],
          },
        ],
        meta: {
          total: 2,
          versions: [2, 1],
        },
      };

      mockPrismaService.triggerHistory.findMany.mockResolvedValue(mockTriggerHistories);

      const result = await service.findAll(mockPayload);

      expect(mockPrismaService.triggerHistory.findMany).toHaveBeenCalledWith({
        where: {
          phaseId: mockPayload.phaseUuid,
          isDeleted: false,
          version: 1,
        },
        include: {
          phase: true,
        },
        orderBy: {
          version: 'desc',
        },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle missing phaseUuid', async () => {
      const invalidPayload = { ...mockPayload, phaseUuid: undefined };

      await expect(service.findAll(invalidPayload as any)).rejects.toThrow(RpcException);
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPrismaService.triggerHistory.findMany.mockRejectedValue(error);

      await expect(service.findAll(mockPayload)).rejects.toThrow(RpcException);
    });

    it('should handle empty results', async () => {
      mockPrismaService.triggerHistory.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockPayload);

      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          versions: [],
        },
      });
    });
  });

  describe('getCurrentVersionByPhaseId', () => {
    const phaseId = 'phase-uuid-123';

    it('should successfully get current version', async () => {
      const mockHistory = {
        id: 1,
        version: 5,
        phaseId,
      };

      mockPrismaService.triggerHistory.findFirst.mockResolvedValue(mockHistory);

      const result = await service.getCurrentVersionByPhaseId(phaseId);

      expect(mockPrismaService.triggerHistory.findFirst).toHaveBeenCalledWith({
        where: { phaseId },
        orderBy: { version: 'desc' },
      });
      expect(result).toBe(5);
    });

    it('should return undefined when no history found', async () => {
      mockPrismaService.triggerHistory.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentVersionByPhaseId(phaseId);

      expect(result).toBeUndefined();
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPrismaService.triggerHistory.findFirst.mockRejectedValue(error);

      await expect(service.getCurrentVersionByPhaseId(phaseId)).rejects.toThrow(RpcException);
    });
  });

  describe('getOne', () => {
    const mockPayload: GetOneTriggerHistoryDto = {
      id: 1,
    };

    it('should successfully get one trigger history', async () => {
      const mockTriggerHistory = {
        id: 1,
        version: 1,
        revertedAt: new Date('2023-01-01'),
        revertedBy: 'user1',
        phase: {
          name: 'Phase 1',
          source: { name: 'Source 1' },
        },
      };

      mockPrismaService.triggerHistory.findUnique.mockResolvedValue(mockTriggerHistory);

      const result = await service.getOne(mockPayload);

      expect(mockPrismaService.triggerHistory.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.id },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTriggerHistory);
    });

    it('should handle database error', async () => {
      const error = new Error('Database error');
      mockPrismaService.triggerHistory.findUnique.mockRejectedValue(error);

      await expect(service.getOne(mockPayload)).rejects.toThrow(RpcException);
    });

    it('should return null when trigger history not found', async () => {
      mockPrismaService.triggerHistory.findUnique.mockResolvedValue(null);

      const result = await service.getOne(mockPayload);

      expect(result).toBeNull();
    });
  });
}); 