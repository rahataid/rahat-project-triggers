import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService, DataSource } from '@lib/database';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';
import { PhasesService } from 'src/phases/phases.service';
import { CORE_MODULE } from 'src/constant';
import {
  GetTriggersDto,
  UpdateTriggerTransactionDto,
  GetByLocationPayloadDto,
} from './dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('TriggerController', () => {
  let controller: TriggerController;
  let mockTriggerService: jest.Mocked<TriggerService>;

  const mockPrismaServiceImplementation = {
    trigger: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    phase: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockClientProxyImplementation = {
    send: jest.fn(),
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
  };

  const mockTriggerQueueImplementation = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockStellarQueueImplementation = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriggerController],
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

    controller = module.get<TriggerController>(TriggerController);
    mockTriggerService = module.get(TriggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create triggers with payload', async () => {
      const mockPayload = {
        user: { name: 'test-user' },
        appId: 'app-id',
        triggers: [
          {
            title: 'Test Trigger',
            description: 'Test Description',
            source: DataSource.MANUAL,
          },
        ],
      };

      const mockCreatedTriggers = [
        {
          uuid: 'trigger-uuid',
          title: 'Test Trigger',
          description: 'Test Description',
          phase: {
            name: 'Test Phase',
            riverBasin: 'Test Basin',
          },
        },
      ];

      jest
        .spyOn(mockTriggerService, 'create')
        .mockResolvedValue(mockCreatedTriggers as any);

      const result = await controller.create(mockPayload);

      expect(mockTriggerService.create).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockCreatedTriggers);
    });

    it('should create bulk triggers', async () => {
      const mockPayload = {
        user: { name: 'test-user' },
        appId: 'app-id',
        triggers: [
          {
            title: 'Trigger 1',
            source: DataSource.MANUAL,
          },
          {
            title: 'Trigger 2',
            source: DataSource.DHM,
          },
        ],
      };

      const mockCreatedTriggers = [
        {
          uuid: 'trigger-1',
          title: 'Trigger 1',
          phase: {
            name: 'Test Phase',
            riverBasin: 'Test Basin',
          },
        },
        {
          uuid: 'trigger-2',
          title: 'Trigger 2',
          phase: {
            name: 'Test Phase',
            riverBasin: 'Test Basin',
          },
        },
      ];

      jest
        .spyOn(mockTriggerService, 'create')
        .mockResolvedValue(mockCreatedTriggers as any);

      const result = await controller.create(mockPayload);

      expect(mockTriggerService.create).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockCreatedTriggers);
    });

    it('should handle create with different user structure', async () => {
      const mockPayload = {
        user: { id: 'user-id', name: 'test-user' },
        appId: 'app-id',
        triggers: [
          {
            title: 'Test Trigger',
            source: DataSource.MANUAL,
          },
        ],
      };

      const mockCreatedTriggers = [
        {
          uuid: 'trigger-uuid',
          title: 'Test Trigger',
          phase: {
            name: 'Test Phase',
            riverBasin: 'Test Basin',
          },
        },
      ];

      jest
        .spyOn(mockTriggerService, 'create')
        .mockResolvedValue(mockCreatedTriggers as any);

      const result = await controller.create(mockPayload);

      expect(mockTriggerService.create).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockCreatedTriggers);
    });
  });

  describe('findAll', () => {
    const mockGetTriggersDto: GetTriggersDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      source: DataSource.MANUAL,
    };

    it('should successfully get all triggers', async () => {
      const mockTriggers = [
        { uuid: 'trigger-1', title: 'Trigger 1' },
        { uuid: 'trigger-2', title: 'Trigger 2' },
      ];

      jest
        .spyOn(mockTriggerService, 'getAll')
        .mockResolvedValue(mockTriggers as any);

      const result = await controller.findAll(mockGetTriggersDto);

      expect(mockTriggerService.getAll).toHaveBeenCalledWith(
        mockGetTriggersDto,
      );
      expect(result).toEqual(mockTriggers);
    });

    it('should handle findAll with different filters', async () => {
      const mockDtoWithFilters = {
        ...mockGetTriggersDto,
        source: DataSource.DHM,
        page: 2,
        perPage: 20,
      };

      const mockFilteredTriggers = [{ uuid: 'trigger-3', title: 'Trigger 3' }];

      jest
        .spyOn(mockTriggerService, 'getAll')
        .mockResolvedValue(mockFilteredTriggers as any);

      const result = await controller.findAll(mockDtoWithFilters);

      expect(mockTriggerService.getAll).toHaveBeenCalledWith(
        mockDtoWithFilters,
      );
      expect(result).toEqual(mockFilteredTriggers);
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
        description: 'Test Description',
      };

      jest
        .spyOn(mockTriggerService, 'findOne')
        .mockResolvedValue(mockTrigger as any);

      const result = await controller.getOne(mockPayload);

      expect(mockTriggerService.findOne).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockTrigger);
    });

    it('should handle getOne with additional payload properties', async () => {
      const mockPayloadWithExtra = {
        uuid: 'trigger-uuid',
        appId: 'app-id',
        includePhase: true,
      };

      const mockTriggerWithPhase = {
        uuid: 'trigger-uuid',
        title: 'Test Trigger',
        phase: {
          name: 'Test Phase',
          riverBasin: 'Test Basin',
        },
      };

      jest
        .spyOn(mockTriggerService, 'findOne')
        .mockResolvedValue(mockTriggerWithPhase as any);

      const result = await controller.getOne(mockPayloadWithExtra);

      expect(mockTriggerService.findOne).toHaveBeenCalledWith(
        mockPayloadWithExtra,
      );
      expect(result).toEqual(mockTriggerWithPhase);
    });
  });

  describe('getByLocation', () => {
    const mockPayload: GetByLocationPayloadDto = {
      riverBasin: 'Test Basin',
      page: 1,
      perPage: 10,
    };

    it('should successfully get triggers by location', async () => {
      const mockTriggers = [
        {
          uuid: 'trigger-1',
          title: 'Trigger 1',
          phase: {
            riverBasin: 'Test Basin',
          },
        },
        {
          uuid: 'trigger-2',
          title: 'Trigger 2',
          phase: {
            riverBasin: 'Test Basin',
          },
        },
      ];

      jest
        .spyOn(mockTriggerService, 'findByLocation')
        .mockResolvedValue(mockTriggers as any);

      const result = await controller.getByLocation(mockPayload);

      expect(mockTriggerService.findByLocation).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockTriggers);
    });

    it('should handle getByLocation with different location', async () => {
      const mockPayloadDifferentLocation: GetByLocationPayloadDto = {
        riverBasin: 'Different Basin',
        page: 1,
        perPage: 10,
      };

      const mockDifferentTriggers = [
        {
          uuid: 'trigger-3',
          title: 'Trigger 3',
          phase: {
            riverBasin: 'Different Basin',
          },
        },
      ];

      jest
        .spyOn(mockTriggerService, 'findByLocation')
        .mockResolvedValue(mockDifferentTriggers as any);

      const result = await controller.getByLocation(
        mockPayloadDifferentLocation,
      );

      expect(mockTriggerService.findByLocation).toHaveBeenCalledWith(
        mockPayloadDifferentLocation,
      );
      expect(result).toEqual(mockDifferentTriggers);
    });
  });

  describe('activateTrigger', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
      appId: 'app-id',
      user: { name: 'test-user' },
      notes: 'Test notes',
    };

    it('should successfully activate trigger', async () => {
      const mockActivatedTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: true,
        triggeredBy: 'test-user',
        triggeredAt: new Date(),
      };

      jest
        .spyOn(mockTriggerService, 'activateTrigger')
        .mockResolvedValue(mockActivatedTrigger as any);

      const result = await controller.activateTrigger(mockPayload);

      expect(mockTriggerService.activateTrigger).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockActivatedTrigger);
    });

    it('should handle activateTrigger with different payload structure', async () => {
      const mockPayloadWithExtra = {
        uuid: 'trigger-uuid',
        appId: 'app-id',
        user: { name: 'test-user' },
        notes: 'Test notes',
        triggerDocuments: [{ key: 'value' }],
      };

      const mockActivatedTrigger = {
        uuid: 'trigger-uuid',
        isTriggered: true,
        triggeredBy: 'test-user',
        triggeredAt: new Date(),
      };

      jest
        .spyOn(mockTriggerService, 'activateTrigger')
        .mockResolvedValue(mockActivatedTrigger as any);

      const result = await controller.activateTrigger(mockPayloadWithExtra);

      expect(mockTriggerService.activateTrigger).toHaveBeenCalledWith(
        mockPayloadWithExtra,
      );
      expect(result).toEqual(mockActivatedTrigger);
    });
  });

  describe('updateTrigger', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
      appId: 'app-id',
      title: 'Updated Trigger',
      description: 'Updated Description',
    };

    it('should successfully update trigger', async () => {
      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        title: 'Updated Trigger',
        description: 'Updated Description',
      };

      jest
        .spyOn(mockTriggerService, 'update')
        .mockResolvedValue(mockUpdatedTrigger as any);

      const result = await controller.updateTrigger(mockPayload);

      expect(mockTriggerService.update).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle updateTrigger with different update data', async () => {
      const mockPayloadWithDifferentData = {
        uuid: 'trigger-uuid',
        appId: 'app-id',
        isMandatory: true,
        notes: 'Updated notes',
      };

      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        isMandatory: true,
        notes: 'Updated notes',
      };

      jest
        .spyOn(mockTriggerService, 'update')
        .mockResolvedValue(mockUpdatedTrigger as any);

      const result = await controller.updateTrigger(
        mockPayloadWithDifferentData,
      );

      expect(mockTriggerService.update).toHaveBeenCalledWith(
        mockPayloadWithDifferentData,
      );
      expect(result).toEqual(mockUpdatedTrigger);
    });
  });

  describe('updateTriggerTransaction', () => {
    const mockPayload: UpdateTriggerTransactionDto = {
      uuid: 'trigger-uuid',
      transactionHash: 'tx-hash-123',
    };

    it('should successfully update trigger transaction', async () => {
      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        transactionHash: 'tx-hash-123',
      };

      jest
        .spyOn(mockTriggerService, 'updateTransaction')
        .mockResolvedValue(mockUpdatedTrigger as any);

      const result = await controller.updateTriggerTransaction(mockPayload);

      expect(mockTriggerService.updateTransaction).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockUpdatedTrigger);
    });

    it('should handle updateTriggerTransaction with different transaction hash', async () => {
      const mockPayloadWithDifferentHash = {
        uuid: 'trigger-uuid',
        transactionHash: 'different-tx-hash-456',
      };

      const mockUpdatedTrigger = {
        uuid: 'trigger-uuid',
        transactionHash: 'different-tx-hash-456',
      };

      jest
        .spyOn(mockTriggerService, 'updateTransaction')
        .mockResolvedValue(mockUpdatedTrigger as any);

      const result = await controller.updateTriggerTransaction(
        mockPayloadWithDifferentHash,
      );

      expect(mockTriggerService.updateTransaction).toHaveBeenCalledWith(
        mockPayloadWithDifferentHash,
      );
      expect(result).toEqual(mockUpdatedTrigger);
    });
  });

  describe('remove', () => {
    const mockPayload = {
      uuid: 'trigger-uuid',
    };

    it('should successfully remove trigger', async () => {
      const mockRemovedTrigger = {
        uuid: 'trigger-uuid',
        isDeleted: true,
      };

      jest
        .spyOn(mockTriggerService, 'remove')
        .mockResolvedValue(mockRemovedTrigger as any);

      const result = await controller.remove(mockPayload);

      expect(mockTriggerService.remove).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockRemovedTrigger);
    });

    it('should handle remove with different uuid', async () => {
      const mockPayloadWithDifferentKey = {
        uuid: 'different-trigger-uuid',
      };

      const mockRemovedTrigger = {
        uuid: 'different-trigger-uuid',
        isDeleted: true,
      };

      jest
        .spyOn(mockTriggerService, 'remove')
        .mockResolvedValue(mockRemovedTrigger as any);

      const result = await controller.remove(mockPayloadWithDifferentKey);

      expect(mockTriggerService.remove).toHaveBeenCalledWith(
        mockPayloadWithDifferentKey,
      );
      expect(result).toEqual(mockRemovedTrigger);
    });
  });
});
