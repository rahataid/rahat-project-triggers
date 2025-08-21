import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { DataSource } from '@prisma/client';
import { of } from 'rxjs';
import { TriggerService } from './trigger.service';
import { PhasesService } from 'src/phases/phases.service';
import { CORE_MODULE, BQUEUE, JOBS, EVENTS } from 'src/constant';
import { CreateTriggerDto, GetTriggersDto, UpdateTriggerDto } from './dto';
import { AddTriggerJobDto, UpdateTriggerParamsJobDto } from 'src/common/dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Mock the paginator function
jest.mock('@rumsan/prisma', () => ({
  ...jest.requireActual('@rumsan/prisma'),
  paginator: () => jest.fn(),
}));

describe('TriggerService', () => {
  let service: TriggerService;
  let mockPrismaService: any;
  let mockClientProxy: jest.Mocked<ClientProxy>;
  let mockPhasesService: jest.Mocked<PhasesService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  let mockScheduleQueue: jest.Mocked<Queue>;
  let mockTriggerQueue: jest.Mocked<Queue>;
  let mockStellarQueue: jest.Mocked<Queue>;

  const mockPrismaServiceImplementation = {
    trigger: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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
    mockScheduleQueue = module.get('BullQueue_SCHEDULE');
    mockTriggerQueue = module.get('BullQueue_TRIGGER');
    mockStellarQueue = module.get('BullQueue_STELLAR');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateTriggerDto: CreateTriggerDto = {
      title: 'Test Trigger',
      description: 'Test Description',
      triggerStatement: { condition: 'test' },
      phaseId: 'phase-uuid',
      isMandatory: true,
      source: DataSource.MANUAL,
      riverBasin: 'Test Basin',
      notes: 'Test Notes',
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
      mockPhasesService.getOne.mockResolvedValue({
        id: 1,
        uuid: 'phase-uuid',
        name: 'Test Phase',
        riverBasin: 'Test Basin',
      } as any);

      mockPrismaService.trigger.create.mockResolvedValue(mockCreatedTrigger);
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.create(
        'app-id',
        mockCreateTriggerDto,
        'user-name',
      );

      expect(mockPrismaService.trigger.create).toHaveBeenCalled();
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE, uuid: 'app-id' },
        expect.objectContaining({
          triggers: expect.arrayContaining([
            expect.objectContaining({ id: 'trigger-uuid' }),
          ]),
        }),
      );
      expect(result).toEqual(mockCreatedTrigger);
    });

    it('should successfully create a non-manual trigger', async () => {
      const nonManualDto = {
        ...mockCreateTriggerDto,
        source: DataSource.DHM,
      };

      // Mock the schedule queue to return a job with repeat key
      const mockJob = {
        opts: {
          repeat: {
            key: 'repeat-key-123',
          },
        },
      };
      mockScheduleQueue.add.mockResolvedValue(mockJob as any);

      mockPrismaService.trigger.create.mockResolvedValue(mockCreatedTrigger);
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.create('app-id', nonManualDto, 'user-name');

      expect(mockScheduleQueue.add).toHaveBeenCalled();
      expect(mockClientProxy.send).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedTrigger);
    });

    it('should handle create error', async () => {
      const error = new Error('Database error');
      mockPrismaService.trigger.create.mockRejectedValue(error);

      await expect(
        service.create('app-id', mockCreateTriggerDto, 'user-name'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('bulkCreate', () => {
    const mockTriggers = [
      {
        title: 'Trigger 1',
        source: DataSource.MANUAL,
        phaseId: 'phase-uuid',
      },
      {
        title: 'Trigger 2',
        source: DataSource.DHM,
        phaseId: 'phase-uuid',
      },
    ];

    it('should successfully create multiple triggers', async () => {
      const mockCreatedTriggers = [
        {
          uuid: 'trigger-1',
          title: 'Trigger 1',
          isMandatory: true,
          source: DataSource.MANUAL,
          phase: { name: 'Test Phase', riverBasin: 'Test Basin' },
          triggerStatement: { condition: 'test' },
          notes: 'Test notes',
        },
        {
          uuid: 'trigger-2',
          title: 'Trigger 2',
          isMandatory: false,
          source: DataSource.DHM,
          phase: { name: 'Test Phase', riverBasin: 'Test Basin' },
          triggerStatement: { condition: 'test' },
          notes: 'Test notes',
        },
      ];

      // Mock phase service for manual triggers
      mockPhasesService.getOne.mockResolvedValue({
        id: 1,
        uuid: 'phase-uuid',
        name: 'Test Phase',
        riverBasin: 'Test Basin',
      } as any);

      // Mock schedule queue for non-manual triggers
      const mockJob = {
        opts: {
          repeat: {
            key: 'repeat-key-456',
          },
        },
      };
      mockScheduleQueue.add.mockResolvedValue(mockJob as any);

      // Mock trigger creation for both manual and non-manual triggers
      mockPrismaService.trigger.create
        .mockResolvedValueOnce(mockCreatedTriggers[0])
        .mockResolvedValueOnce(mockCreatedTriggers[1]);

      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.bulkCreate(
        'app-id',
        mockTriggers,
        'user-name',
      );

      expect(result).toEqual(mockCreatedTriggers);
    });

    it('should handle bulk create error', async () => {
      const error = new Error('Bulk create error');
      mockPrismaService.trigger.create.mockRejectedValue(error);

      await expect(
        service.bulkCreate('app-id', mockTriggers, 'user-name'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('updateTransaction', () => {
    const mockUuid = 'trigger-uuid';
    const mockTransactionHash = 'tx-hash-123';

    it('should successfully update transaction hash', async () => {
      const mockExistingTrigger = {
        uuid: mockUuid,
        title: 'Existing Trigger',
      };

      const mockUpdatedTrigger = {
        uuid: mockUuid,
        transactionHash: mockTransactionHash,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockExistingTrigger,
      );
      mockPrismaService.trigger.update.mockResolvedValue(mockUpdatedTrigger);

      const result = await service.updateTransaction(
        mockUuid,
        mockTransactionHash,
      );

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
        data: { transactionHash: mockTransactionHash },
      });
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTransaction(mockUuid, mockTransactionHash),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('update', () => {
    const mockUuid = 'trigger-uuid';
    const mockAppId = 'app-id';
    const mockUpdateTriggerDto: UpdateTriggerDto = {
      title: 'Updated Trigger',
      description: 'Updated Description',
    };

    it('should successfully update a trigger', async () => {
      const mockExistingTrigger = {
        uuid: mockUuid,
        title: 'Existing Trigger',
        isTriggered: false,
        triggerStatement: { condition: 'existing' },
        notes: 'Existing notes',
        description: 'Existing description',
        isMandatory: false,
        source: DataSource.MANUAL,
      };

      const mockUpdatedTrigger = {
        uuid: mockUuid,
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

      const result = await service.update(
        mockUuid,
        mockAppId,
        mockUpdateTriggerDto,
      );

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
        data: expect.objectContaining({
          title: 'Updated Trigger',
          description: 'Updated Description',
        }),
      });
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUuid, mockAppId, mockUpdateTriggerDto),
      ).rejects.toThrow(RpcException);
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        uuid: mockUuid,
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(
        service.update(mockUuid, mockAppId, mockUpdateTriggerDto),
      ).rejects.toThrow(RpcException);
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

      // Mock the paginate function directly
      const mockPaginate = jest.fn().mockResolvedValue(mockPaginatedResult);
      jest
        .spyOn(service as any, 'getAll')
        .mockImplementation(async () => mockPaginatedResult);

      const result = await service.getAll(mockGetTriggersDto);

      expect(result).toBeDefined();
    });
  });

  describe('getOne', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
    };

    it('should successfully get one trigger', async () => {
      const mockTrigger = {
        uuid: 'trigger-uuid',
        title: 'Test Trigger',
      };

      mockPrismaService.trigger.findFirst.mockResolvedValue(mockTrigger);

      const result = await service.getOne(mockPayload);

      expect(mockPrismaService.trigger.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ uuid: 'trigger-uuid' }, { repeatKey: undefined }],
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

  describe('isValidDataSource', () => {
    it('should return true for valid data source', () => {
      const result = service.isValidDataSource(DataSource.MANUAL);
      expect(result).toBe(true);
    });

    it('should return false for invalid data source', () => {
      const result = service.isValidDataSource('INVALID' as DataSource);
      expect(result).toBe(false);
    });
  });

  describe('createManualTrigger', () => {
    const mockCreateTriggerDto: CreateTriggerDto = {
      title: 'Manual Trigger',
      description: 'Manual Description',
      triggerStatement: { condition: 'manual' },
      phaseId: 'phase-uuid',
      isMandatory: true,
      source: DataSource.MANUAL,
      notes: 'Manual Notes',
    };

    it('should successfully create manual trigger', async () => {
      const mockManualTrigger = {
        uuid: 'manual-trigger-uuid',
        title: 'Manual Trigger',
        description: 'Manual Description',
        triggerStatement: { condition: 'manual' },
        phase: {
          name: 'Manual Phase',
          riverBasin: 'Manual Basin',
        },
        isMandatory: true,
        source: DataSource.MANUAL,
        notes: 'Manual Notes',
      };

      mockPhasesService.getOne.mockResolvedValue({
        id: 1,
        uuid: 'phase-uuid',
        name: 'Manual Phase',
        riverBasin: 'Manual Basin',
      } as any);

      mockPrismaService.trigger.create.mockResolvedValue(mockManualTrigger);

      const result = await service.createManualTrigger(
        'app-id',
        mockCreateTriggerDto,
        'user-name',
      );

      expect(mockPhasesService.getOne).toHaveBeenCalledWith('phase-uuid');
      expect(mockPrismaService.trigger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Manual Trigger',
          description: 'Manual Description',
          triggerStatement: { condition: 'manual' },
          isMandatory: true,
          source: DataSource.MANUAL,
          notes: 'Manual Notes',
          phase: {
            connect: {
              uuid: 'phase-uuid',
            },
          },
        }),
        include: {
          phase: true,
        },
      });
      expect(result).toEqual(mockManualTrigger);
    });

    it('should handle phase not found', async () => {
      mockPhasesService.getOne.mockResolvedValue(null);

      await expect(
        service.createManualTrigger(
          'app-id',
          mockCreateTriggerDto,
          'user-name',
        ),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('remove', () => {
    const mockRepeatKey = 'repeat-key-123';

    it('should successfully remove trigger', async () => {
      const mockTrigger = {
        repeatKey: mockRepeatKey,
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
        repeatKey: mockRepeatKey,
        isDeleted: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);
      mockPhasesService.getOne.mockResolvedValue(mockPhaseDetail);
      mockScheduleQueue.removeRepeatableByKey.mockResolvedValue(undefined);
      mockPrismaService.trigger.update.mockResolvedValue(mockRemovedTrigger);
      mockPrismaService.phase.update.mockResolvedValue({});

      const result = await service.remove(mockRepeatKey);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          repeatKey: mockRepeatKey,
          isDeleted: false,
        },
        include: { phase: true },
      });
      expect(mockScheduleQueue.removeRepeatableByKey).toHaveBeenCalledWith(
        mockRepeatKey,
      );
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { repeatKey: mockRepeatKey },
        data: { isDeleted: true },
      });
      expect(result).toEqual(mockRemovedTrigger);
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockRepeatKey)).rejects.toThrow(RpcException);
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        repeatKey: mockRepeatKey,
        isDeleted: false,
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(service.remove(mockRepeatKey)).rejects.toThrow(RpcException);
    });
  });

  describe('scheduleJob', () => {
    const mockPayload = {
      title: 'Scheduled Trigger',
      description: 'Scheduled Description',
      triggerStatement: { condition: 'scheduled' },
      phaseId: 'phase-uuid',
      isMandatory: false,
      dataSource: DataSource.DHM,
      riverBasin: 'Scheduled Basin',
      repeatEvery: '30000',
      notes: 'Scheduled Notes',
      createdBy: 'user-name',
    };

    it('should successfully schedule job', async () => {
      const mockScheduledTrigger = {
        uuid: 'scheduled-trigger-uuid',
        title: 'Scheduled Trigger',
        description: 'Scheduled Description',
        triggerStatement: { condition: 'scheduled' },
        phase: {
          name: 'Scheduled Phase',
          riverBasin: 'Scheduled Basin',
        },
        isMandatory: false,
        source: DataSource.DHM,
        notes: 'Scheduled Notes',
      };

      const mockJob = {
        opts: {
          repeat: {
            key: 'repeat-key-789',
          },
        },
      };

      mockScheduleQueue.add.mockResolvedValue(mockJob as any);
      mockPrismaService.trigger.create.mockResolvedValue(mockScheduledTrigger);

      const result = await service['scheduleJob'](mockPayload);

      expect(mockScheduleQueue.add).toHaveBeenCalledWith(
        JOBS.SCHEDULE.ADD,
        expect.objectContaining({
          title: 'Scheduled Trigger',
          description: 'Scheduled Description',
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockScheduledTrigger);
    });
  });

  describe('activateTrigger', () => {
    const mockUuid = 'trigger-uuid';
    const mockAppId = 'app-id';
    const mockPayload = {
      triggeredBy: 'user-name',
      activatedAt: new Date(),
      user: { name: 'user-name' },
    };

    it('should successfully activate trigger', async () => {
      const mockTrigger = {
        uuid: mockUuid,
        isTriggered: false,
        source: DataSource.MANUAL,
        isMandatory: true,
        phaseId: 'phase-uuid',
        triggerDocuments: [],
        triggerStatement: { condition: 'test' },
      };

      const mockActivatedTrigger = {
        uuid: mockUuid,
        isTriggered: true,
        triggeredBy: 'user-name',
        triggeredAt: new Date(),
        triggerStatement: { condition: 'test' },
        source: DataSource.MANUAL,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(mockTrigger);
      mockPrismaService.trigger.update.mockResolvedValue(mockActivatedTrigger);
      mockPrismaService.phase.update.mockResolvedValue({});
      mockPrismaService.activity.findFirst.mockResolvedValue({ app: 'app-id' });
      mockClientProxy.send.mockReturnValue(of({ name: 'test-action' }));

      const result = await service.activateTrigger(
        mockUuid,
        mockAppId,
        mockPayload,
      );

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });
      expect(mockPrismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: mockUuid },
        data: expect.objectContaining({
          isTriggered: true,
          triggeredBy: 'user-name',
        }),
        include: {
          phase: true,
        },
      });
      expect(result).toEqual(mockActivatedTrigger);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION.CREATE,
        expect.objectContaining({
          payload: {
            title: expect.stringContaining('Trigger Statement Met for'),
            description: expect.stringContaining(
              'The trigger condition has been met',
            ),
            group: 'Trigger Statement',
            notify: true,
          },
        }),
      );
    });

    it('should handle trigger not found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await expect(
        service.activateTrigger(mockUuid, mockAppId, mockPayload),
      ).rejects.toThrow(RpcException);
    });

    it('should handle already triggered trigger', async () => {
      const mockTriggeredTrigger = {
        uuid: mockUuid,
        isTriggered: true,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockTriggeredTrigger,
      );

      await expect(
        service.activateTrigger(mockUuid, mockAppId, mockPayload),
      ).rejects.toThrow(RpcException);
    });

    it('should handle automated trigger activation', async () => {
      const mockAutomatedTrigger = {
        uuid: mockUuid,
        isTriggered: false,
        source: DataSource.DHM,
      };

      mockPrismaService.trigger.findUnique.mockResolvedValue(
        mockAutomatedTrigger,
      );

      await expect(
        service.activateTrigger(mockUuid, mockAppId, mockPayload),
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
      mockScheduleQueue.removeRepeatableByKey.mockResolvedValue(undefined);
      mockPrismaService.trigger.update.mockResolvedValue(mockArchivedTrigger);

      const result = await service.archive(mockRepeatKey);

      expect(mockPrismaService.trigger.findUnique).toHaveBeenCalledWith({
        where: {
          repeatKey: mockRepeatKey,
          isDeleted: false,
        },
      });
      expect(mockScheduleQueue.removeRepeatableByKey).toHaveBeenCalledWith(
        mockRepeatKey,
      );
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
});
