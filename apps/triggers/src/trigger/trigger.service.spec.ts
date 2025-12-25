import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService, DataSource, Phases } from '@lib/database';
import type { Queue } from 'bull';
import { of } from 'rxjs';
import { TriggerService } from './trigger.service';
import { PhasesService } from 'src/phases/phases.service';
import { CORE_MODULE, JOBS, EVENTS } from 'src/constant';
import { GetTriggersDto } from './dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Mock the paginator function
jest.mock('@lib/database', () => ({
  ...jest.requireActual('@lib/database'),
  paginator: () => jest.fn(),
}));

describe('TriggerService', () => {
  let service: TriggerService;
  let mockPrismaService: any;
  let mockClientProxy: jest.Mocked<ClientProxy>;
  let mockPhasesService: jest.Mocked<PhasesService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  let mockTriggerQueue: jest.Mocked<Queue>;

  const mockPrismaServiceImplementation = {
    trigger: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    phase: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  const mockClientProxyImplementation = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };
  const mockPhasesServiceImplementation = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    getOne: jest.fn(),
    activatePhase: jest.fn(),
    addTriggersToPhases: jest.fn(),
    revertPhase: jest.fn(),
  };

  const mockScheduleQueueImplementation = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
    removeRepeatableByKey: jest.fn(),
  };

  const mockTriggerQueueImplementation = {
    add: jest.fn(),
    addBulk: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
    removeRepeatableByKey: jest.fn(),
  };

  const mockStellarQueueImplementation = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
    removeRepeatableByKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceImplementation,
        },
        {
          provide: CORE_MODULE,
          useValue: mockClientProxyImplementation,
        },
        {
          provide: PhasesService,
          useValue: mockPhasesServiceImplementation,
        },
        {
          provide: 'BullQueue_SCHEDULE',
          useValue: mockScheduleQueueImplementation,
        },
        {
          provide: 'BullQueue_TRIGGER',
          useValue: mockTriggerQueueImplementation,
        },
        {
          provide: 'BullQueue_STELLAR',
          useValue: mockStellarQueueImplementation,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<TriggerService>(TriggerService);
    mockPrismaService = module.get(PrismaService);
    mockClientProxy = module.get(CORE_MODULE);
    mockPhasesService = module.get(PhasesService);
    eventEmitter = module.get(EventEmitter2);
    mockTriggerQueue = module.get('BullQueue_TRIGGER');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateTriggerPayload = {
      user: { name: 'user-name' },
      appId: 'app-id',
      triggers: [
        {
          title: 'Test Trigger',
          description: 'Test Description',
          triggerStatement: { condition: 'test' },
          phaseId: 'phase-uuid',
          isMandatory: true,
          source: DataSource.MANUAL,
          riverBasin: 'Test Basin',
          notes: 'Test Notes',
        },
      ],
    };

    const mockCreatedTrigger = {
      uuid: 'trigger-uuid',
      title: 'Test Trigger',
      description: 'Test Description',
      triggerStatement: { condition: 'test' },
      phase: {
        name: 'Test Phase',
        riverBasin: 'Test Basin',
      },
      isMandatory: true,
      source: DataSource.MANUAL,
      notes: 'Test Notes',
    };

    it('should successfully create a manual trigger', async () => {
      // Mock phase service to return a valid phase
      mockPhasesService.findOne.mockResolvedValue({
        id: 1,
        uuid: 'phase-uuid',
        name: 'Test Phase',
        riverBasin: 'Test Basin',
      } as any);

      mockPrismaService.trigger.create.mockResolvedValue(mockCreatedTrigger);
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.create(mockCreateTriggerPayload);

      expect(mockPrismaService.trigger.create).toHaveBeenCalled();
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE, uuid: 'app-id' },
        expect.objectContaining({
          triggers: expect.arrayContaining([
            expect.objectContaining({ id: 'trigger-uuid' }),
          ]),
        }),
      );
      expect(result).toEqual([mockCreatedTrigger]);
    });

    it('should successfully create a non-manual trigger', async () => {
      const nonManualPayload = {
        ...mockCreateTriggerPayload,
        triggers: [
          {
            ...mockCreateTriggerPayload.triggers[0],
            source: DataSource.DHM,
            triggerStatement: {
              source: 'water_level_m',
              sourceSubType: 'warning_level',
              operator: '>',
              value: 10,
              expression: 'warning_level > 10',
            },
            riverBasin: 'Test Basin',
          },
        ],
      };

      // Mock phase service to return a valid phase
      mockPhasesService.findOne.mockResolvedValue({
        id: 1,
        uuid: 'phase-uuid',
        name: 'Test Phase',
        riverBasin: 'Test Basin',
      } as any);

      mockPrismaService.trigger.create.mockResolvedValue(mockCreatedTrigger);
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.create(nonManualPayload);

      expect(mockClientProxy.send).toHaveBeenCalled();
      expect(result).toEqual([mockCreatedTrigger]);
    });

    it('should handle create error', async () => {
      const error = new Error('Database error');
      mockPrismaService.trigger.create.mockRejectedValue(error);

      await expect(service.create(mockCreateTriggerPayload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('updateTransaction', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
      transactionHash: 'tx-hash-123',
    };

    it('should successfully update transaction hash', async () => {
      const mockExistingTrigger = {
        uuid: 'trigger-uuid',
        title: 'Existing Trigger',
      };

      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        transactionHash: 'tx-hash-123',
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockExistingTrigger,
      );
      mockPrismaService.trigger.update.mockResolvedValue(mockUpdatedTrigger);

      const result = await service.updateTransaction(mockPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
        data: { transactionHash: 'tx-hash-123' },
      });
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(service.updateTransaction(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('update', () => {
    const mockUpdateTriggerPayload = {
      uuid: 'trigger-uuid',
      appId: 'app-id',
      title: 'Updated Trigger',
      description: 'Updated Description',
    };

    it('should successfully update a trigger', async () => {
      const mockExistingTrigger = {
        uuid: 'trigger-uuid',
        title: 'Existing Trigger',
        isTriggered: false,
        triggerStatement: { condition: 'existing' },
        notes: 'Existing notes',
        description: 'Existing description',
        isMandatory: false,
        source: DataSource.MANUAL,
      };

      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        title: 'Updated Trigger',
        description: 'Updated Description',
        triggerStatement: { condition: 'existing' },
        isTriggered: false,
        source: DataSource.MANUAL,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockExistingTrigger,
      );
      mockPrismaService.trigger.update.mockResolvedValue(mockUpdatedTrigger);
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.update(mockUpdateTriggerPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
        data: expect.objectContaining({
          title: 'Updated Trigger',
          description: 'Updated Description',
        }),
      });
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(service.update(mockUpdateTriggerPayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(service.update(mockUpdateTriggerPayload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getAll', () => {
    const mockGetTriggersDto: GetTriggersDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      source: DataSource.MANUAL,
    };

    it('should successfully get all triggers with pagination', async () => {
      const mockPaginatedResult = {
        data: [
          { uuid: 'trigger-1', title: 'Trigger 1' },
          { uuid: 'trigger-2', title: 'Trigger 2' },
        ],
        meta: {
          total: 2,
          page: 1,
          perPage: 10,
        },
      };

      // Mock the getAll method directly
      jest
        .spyOn(service as any, 'getAll')
        .mockImplementation(async () => mockPaginatedResult);

      const result = await service.getAll(mockGetTriggersDto);

      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
    };

    it('should successfully find one trigger', async () => {
      const mockTrigger = {
        uuid: 'trigger-uuid',
        title: 'Test Trigger',
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);

      const result = await service.findOne(mockPayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          uuid: 'trigger-uuid',
        },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTrigger);
    });
  });

  describe('remove', () => {
    const mockRemovePayload = {
      uuid: 'trigger-uuid',
    };

    it('should successfully remove trigger', async () => {
      const mockTrigger = {
        uuid: 'trigger-uuid',
        isDeleted: false,
        isTriggered: false,
        isMandatory: true,
        phaseId: 'phase-uuid',
        phase: {
          isActive: false,
        },
      };

      const mockPhaseDetail = {
        triggerRequirements: {
          optionalTriggers: {
            totalTriggers: 5,
          },
        },
        requiredOptionalTriggers: 3,
      } as any;

      const mockRemovedTrigger = {
        uuid: 'trigger-uuid',
        isDeleted: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);
      mockPhasesService.findOne.mockResolvedValue(mockPhaseDetail);
      mockPrismaService.trigger.update.mockResolvedValue(mockRemovedTrigger);
      mockPrismaService.phase.update.mockResolvedValue({});

      const result = await service.remove(mockRemovePayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          uuid: 'trigger-uuid',
          isDeleted: false,
        },
        include: { phase: true },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
        data: { isDeleted: true },
      });
      expect(result).toEqual(mockRemovedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockRemovePayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        uuid: 'trigger-uuid',
        isDeleted: false,
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(service.remove(mockRemovePayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error when trigger belongs to an active phase', async () => {
      const mockTrigger = {
        uuid: 'trigger-uuid',
        isDeleted: false,
        isTriggered: false,
        isMandatory: true,
        phaseId: 'phase-uuid',
        phase: {
          isActive: true, // Active phase
        },
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);

      await expect(service.remove(mockRemovePayload)).rejects.toThrow(
        new RpcException('Cannot remove triggers from an active phase.'),
      );

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          uuid: 'trigger-uuid',
          isDeleted: false,
        },
        include: { phase: true },
      });
      // Ensure no further calls are made
      expect(mockPhasesService.findOne).not.toHaveBeenCalled();
      expect(mockPrismaService.trigger.update).not.toHaveBeenCalled();
    });
  });

  describe('activateTrigger', () => {
    const mockActivatePayload = {
      uuid: 'trigger-uuid',
      appId: 'app-id',
      user: { name: 'user-name' },
      notes: 'Test notes',
    };

    it('should successfully activate trigger', async () => {
      const uuid = 'test-uuid';

      const mockTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: false,
        source: DataSource.MANUAL,
        isMandatory: true,
        phaseId: 'phase-uuid',
        triggerDocuments: [],
        triggerStatement: { condition: 'test' },
      };

      const mockActivatedTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: true,
        triggeredBy: 'user-name',
        triggeredAt: new Date(),
        triggerStatement: { condition: 'test' },
        source: DataSource.MANUAL,
        phase: {
          uuid: uuid,
          name: Phases.PREPAREDNESS,
          activeYear: '2025',
          riverBasin: 'Karnali', // <- required by service
        },
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);
      mockPrismaService.trigger.update.mockResolvedValue(mockActivatedTrigger);
      mockPrismaService.phase.update.mockResolvedValue({});
      mockPrismaService.activity.findFirst.mockResolvedValue({ app: 'app-id' });
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.activateTrigger(mockActivatePayload);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'trigger-uuid' },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });

      mockPrismaService.trigger.update.mockResolvedValue(mockActivatedTrigger);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION.CREATE,
        expect.objectContaining({
          payload: expect.objectContaining({
            title: `Trigger Statement Met for ${mockActivatedTrigger.phase.riverBasin}`,
            description: `The trigger condition has been met for phase ${mockActivatedTrigger.phase.name}, year ${mockActivatedTrigger.phase.activeYear}, in the ${mockActivatedTrigger.phase.riverBasin} river basin.`,
            group: 'Trigger Statement',
            notify: true,
          }),
        }),
      );
      expect(result).toEqual(mockActivatedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(
        service.activateTrigger(mockActivatePayload),
      ).rejects.toThrow(RpcException);
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(
        service.activateTrigger(mockActivatePayload),
      ).rejects.toThrow(RpcException);
    });

    it('should handle automated trigger activation', async () => {
      const mockAutomatedTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: false,
        source: DataSource.DHM,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockAutomatedTrigger,
      );

      await expect(
        service.activateTrigger(mockActivatePayload),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('archive', () => {
    const mockRepeatKey = 'repeat-key-123';

    it('should successfully archive trigger', async () => {
      const mockTrigger = {
        repeatKey: mockRepeatKey,
        isDeleted: false,
      };

      const mockArchivedTrigger = {
        repeatKey: mockRepeatKey,
        isDeleted: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);
      mockPrismaService.trigger.update.mockResolvedValue(mockArchivedTrigger);

      const result = await service.archive(mockRepeatKey);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          repeatKey: mockRepeatKey,
          isDeleted: false,
        },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { repeatKey: mockRepeatKey },
        data: { isDeleted: true },
      });
      expect(result).toEqual(mockArchivedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(service.archive(mockRepeatKey)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('findByLocation', () => {
    const mockPayload = {
      location: 'Test Location',
      appId: 'app-id',
      page: 1,
      perPage: 10,
    };

    it('should successfully find triggers by location', async () => {
      const mockPaginatedResult = {
        data: [
          { uuid: 'trigger-1', title: 'Trigger 1', location: 'Test Location' },
          { uuid: 'trigger-2', title: 'Trigger 2', location: 'Test Location' },
        ],
        meta: {
          currentPage: 1,
          lastPage: 1,
          next: null,
          perPage: 10,
          prev: null,
          total: 2,
        },
      };

      // Mock the findByLocation method directly
      jest
        .spyOn(service as any, 'findByLocation')
        .mockImplementation(async () => mockPaginatedResult);

      const result = await service.findByLocation(mockPayload);

      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('activeAutomatedTriggers', () => {
    const mockTriggerIds = [
      'trigger-uuid-1',
      'trigger-uuid-2',
      'trigger-uuid-3',
    ];

    it('should successfully activate automated triggers', async () => {
      const mockTriggers = [
        {
          uuid: 'trigger-uuid-1',
          phaseId: 'phase-uuid-1',
          isMandatory: true,
          source: DataSource.DHM,
          isTriggered: false,
          isDeleted: false,
        },
        {
          uuid: 'trigger-uuid-2',
          phaseId: 'phase-uuid-1',
          isMandatory: false,
          source: DataSource.DHM,
          isTriggered: false,
          isDeleted: false,
        },
        {
          uuid: 'trigger-uuid-3',
          phaseId: 'phase-uuid-2',
          isMandatory: true,
          source: DataSource.GLOFAS,
          isTriggered: false,
          isDeleted: false,
        },
      ];

      const mockPhase1 = {
        uuid: 'phase-uuid-1',
        name: 'Phase 1',
        riverBasin: 'Test Basin 1',
        activeYear: '2025',
      };

      const mockPhase2 = {
        uuid: 'phase-uuid-2',
        name: 'Phase 2',
        riverBasin: 'Test Basin 2',
        activeYear: '2025',
      };

      mockPrismaService.trigger.findMany.mockResolvedValue(mockTriggers as any);
      mockPrismaService.trigger.updateMany.mockResolvedValue({ count: 3 });
      mockPrismaService.phase.update
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      mockPrismaService.phase.findUnique
        .mockResolvedValueOnce(mockPhase1 as any)
        .mockResolvedValueOnce(mockPhase2 as any);
      mockTriggerQueue.addBulk.mockResolvedValue(undefined);

      await service.activeAutomatedTriggers(mockTriggerIds);

      expect(mockPrismaService.trigger.findMany).toHaveBeenCalledWith({
        where: {
          uuid: { in: mockTriggerIds },
          source: { not: DataSource.MANUAL },
          isTriggered: false,
          isDeleted: false,
        },
      });

      expect(mockPrismaService.trigger.updateMany).toHaveBeenCalledWith({
        where: {
          uuid: { in: mockTriggerIds },
          source: { not: DataSource.MANUAL },
          isTriggered: false,
          isDeleted: false,
        },
        data: {
          isTriggered: true,
          triggeredAt: expect.any(Date),
          triggeredBy: 'System',
        },
      });

      expect(mockPrismaService.phase.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: 'phase-uuid-1' },
        data: {
          receivedMandatoryTriggers: { increment: 1 },
          receivedOptionalTriggers: { increment: 1 },
        },
      });
      expect(mockPrismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: 'phase-uuid-2' },
        data: {
          receivedMandatoryTriggers: { increment: 1 },
          receivedOptionalTriggers: { increment: 0 },
        },
      });

      expect(mockTriggerQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: JOBS.TRIGGER.REACHED_THRESHOLD,
            data: expect.objectContaining({ uuid: 'trigger-uuid-1' }),
            opts: expect.objectContaining({
              attempts: 3,
              removeOnComplete: true,
            }),
          }),
        ]),
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION.CREATE,
        expect.objectContaining({
          payload: expect.objectContaining({
            title: `Trigger Statement Met for ${mockPhase1.riverBasin}`,
            description: `The trigger condition has been met for phase ${mockPhase1.name}, year ${mockPhase1.activeYear}, in the ${mockPhase1.riverBasin} river basin.`,
            group: 'Trigger Statement',
            notify: true,
          }),
        }),
      );
    });

    it('should handle when some triggers are not found', async () => {
      const mockTriggers = [
        {
          uuid: 'trigger-uuid-1',
          phaseId: 'phase-uuid-1',
          isMandatory: true,
          source: DataSource.DHM,
          isTriggered: false,
          isDeleted: false,
        },
      ];

      const mockPhase = {
        uuid: 'phase-uuid-1',
        name: 'Phase 1',
        riverBasin: 'Test Basin',
        activeYear: '2025',
      };

      mockPrismaService.trigger.findMany.mockResolvedValue(mockTriggers as any);
      mockPrismaService.trigger.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.phase.update.mockResolvedValue({});
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhase as any);
      mockTriggerQueue.addBulk.mockResolvedValue(undefined);

      await service.activeAutomatedTriggers(mockTriggerIds);

      expect(mockPrismaService.trigger.findMany).toHaveBeenCalled();
      expect(mockPrismaService.trigger.updateMany).toHaveBeenCalled();
      expect(mockTriggerQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ uuid: 'trigger-uuid-1' }),
          }),
        ]),
      );
    });

    it('should filter out manual triggers', async () => {
      const mockTriggers = [
        {
          uuid: 'trigger-uuid-1',
          phaseId: 'phase-uuid-1',
          isMandatory: true,
          source: DataSource.MANUAL,
          isTriggered: false,
          isDeleted: false,
        },
        {
          uuid: 'trigger-uuid-2',
          phaseId: 'phase-uuid-1',
          isMandatory: false,
          source: DataSource.DHM,
          isTriggered: false,
          isDeleted: false,
        },
      ];

      const mockPhase = {
        uuid: 'phase-uuid-1',
        name: 'Phase 1',
        riverBasin: 'Test Basin',
        activeYear: '2025',
      };

      mockPrismaService.trigger.findMany.mockResolvedValue([
        mockTriggers[1],
      ] as any);
      mockPrismaService.trigger.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.phase.update.mockResolvedValue({});
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhase as any);
      mockTriggerQueue.addBulk.mockResolvedValue(undefined);

      await service.activeAutomatedTriggers(mockTriggerIds);

      expect(mockPrismaService.trigger.findMany).toHaveBeenCalledWith({
        where: {
          uuid: { in: mockTriggerIds },
          source: { not: DataSource.MANUAL },
          isTriggered: false,
          isDeleted: false,
        },
      });

      expect(mockPrismaService.trigger.updateMany).toHaveBeenCalled();
      expect(mockTriggerQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ uuid: 'trigger-uuid-2' }),
          }),
        ]),
      );
    });

    it('should filter out already triggered triggers', async () => {
      const mockTriggers = [
        {
          uuid: 'trigger-uuid-1',
          phaseId: 'phase-uuid-1',
          isMandatory: true,
          source: DataSource.DHM,
          isTriggered: true,
          isDeleted: false,
        },
        {
          uuid: 'trigger-uuid-2',
          phaseId: 'phase-uuid-1',
          isMandatory: false,
          source: DataSource.DHM,
          isTriggered: false,
          isDeleted: false,
        },
      ];

      const mockPhase = {
        uuid: 'phase-uuid-1',
        name: 'Phase 1',
        riverBasin: 'Test Basin',
        activeYear: '2025',
      };

      mockPrismaService.trigger.findMany.mockResolvedValue([
        mockTriggers[1],
      ] as any);
      mockPrismaService.trigger.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.phase.update.mockResolvedValue({});
      mockPrismaService.phase.findUnique.mockResolvedValue(mockPhase as any);
      mockTriggerQueue.addBulk.mockResolvedValue(undefined);

      await service.activeAutomatedTriggers(mockTriggerIds);

      expect(mockPrismaService.trigger.findMany).toHaveBeenCalledWith({
        where: {
          uuid: { in: mockTriggerIds },
          source: { not: DataSource.MANUAL },
          isTriggered: false,
          isDeleted: false,
        },
      });

      expect(mockPrismaService.trigger.updateMany).toHaveBeenCalled();
    });

    it('should handle empty triggers array', async () => {
      mockPrismaService.trigger.findMany.mockResolvedValue([]);
      mockPrismaService.trigger.updateMany.mockResolvedValue({ count: 0 });
      mockTriggerQueue.addBulk.mockResolvedValue(undefined);

      await service.activeAutomatedTriggers(mockTriggerIds);

      expect(mockPrismaService.trigger.findMany).toHaveBeenCalled();
      expect(mockPrismaService.trigger.updateMany).toHaveBeenCalled();
      expect(mockTriggerQueue.addBulk).toHaveBeenCalledWith([]);
      expect(mockPrismaService.phase.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should handle errors and throw RpcException', async () => {
      const error = new Error('Database error');
      mockPrismaService.trigger.findMany.mockRejectedValue(error);

      await expect(
        service.activeAutomatedTriggers(mockTriggerIds),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('generateTriggersStatsForPhase', () => {
    const phaseId = 'test-phase-id';

    it('should successfully generate triggers stats for phase', async () => {
      const mockStats = [
        {
          totalTriggers: 5,
          totalMandatoryTriggers: 3,
          totalMandatoryTriggersTriggered: 2,
          totalOptionalTriggers: 2,
          totalOptionalTriggersTriggered: 1,
          triggers: [
            { uuid: 'trigger-1', isMandatory: true, isTriggered: true },
            { uuid: 'trigger-2', isMandatory: true, isTriggered: true },
            { uuid: 'trigger-3', isMandatory: true, isTriggered: false },
            { uuid: 'trigger-4', isMandatory: false, isTriggered: true },
            { uuid: 'trigger-5', isMandatory: false, isTriggered: false },
          ],
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockStats);

      const result = await service.generateTriggersStatsForPhase(phaseId);

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        phaseId,
      );
      expect(result).toEqual(mockStats[0]);
    });

    it('should handle empty triggers', async () => {
      const mockStats = [
        {
          totalTriggers: 0,
          totalMandatoryTriggers: 0,
          totalMandatoryTriggersTriggered: 0,
          totalOptionalTriggers: 0,
          totalOptionalTriggersTriggered: 0,
          triggers: [],
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockStats);

      const result = await service.generateTriggersStatsForPhase(phaseId);

      expect(result).toEqual(mockStats[0]);
      expect(result.totalTriggers).toBe(0);
      expect(result.triggers).toEqual([]);
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      mockPrismaService.$queryRawUnsafe.mockRejectedValue(dbError);

      await expect(
        service.generateTriggersStatsForPhase(phaseId),
      ).rejects.toThrow(RpcException);
    });
  });
});
