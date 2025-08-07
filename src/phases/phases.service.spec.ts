import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { BadRequestException } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { TriggerService } from 'src/trigger/trigger.service';
import { MS_TRIGGER_CLIENTS, BQUEUE, EVENTS, JOBS } from 'src/constant';
import {
  CreatePhaseDto,
  UpdatePhaseDto,
  GetPhaseDto,
  GetPhaseByName,
  ConfigureThresholdPhaseDto,
} from './dto';
import { ActivityStatus, DataSource, Phases } from '@prisma/client';
import { of } from 'rxjs';

describe('PhasesService', () => {
  let service: PhasesService;
  let prismaService: jest.Mocked<PrismaService>;
  let triggerService: jest.Mocked<TriggerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let communicationQueue: jest.Mocked<Queue>;
  let clientProxy: jest.Mocked<ClientProxy>;

  const mockPrismaService = {
    phase: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    source: {
      findFirst: jest.fn(),
    },
    trigger: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTriggerService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    getAll: jest.fn(),
    getOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activateTrigger: jest.fn(),
    archive: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCommunicationQueue = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhasesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TriggerService,
          useValue: mockTriggerService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: `BullQueue_${BQUEUE.CONTRACT}`,
          useValue: { add: jest.fn() },
        },
        {
          provide: `BullQueue_${BQUEUE.COMMUNICATION}`,
          useValue: mockCommunicationQueue,
        },
        {
          provide: MS_TRIGGER_CLIENTS.RAHAT,
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<PhasesService>(PhasesService);
    prismaService = module.get(PrismaService);
    triggerService = module.get(TriggerService);
    eventEmitter = module.get(EventEmitter2);
    communicationQueue = module.get(`BullQueue_${BQUEUE.COMMUNICATION}`);
    clientProxy = module.get(MS_TRIGGER_CLIENTS.RAHAT);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createPhaseDto: CreatePhaseDto = {
      name: Phases.PREPAREDNESS,
      activeYear: '2025',
      source: DataSource.DHM,
      river_basin: 'Karnali',
      canRevert: true,
      canTriggerPayout: false,
      requiredMandatoryTriggers: 2,
      requiredOptionalTriggers: 1,
      receivedMandatoryTriggers: 0,
      receivedOptionalTriggers: 0,
    };

    it('should create a phase successfully', async () => {
      const mockCreatedPhase = {
        uuid: 'test-uuid',
        name: Phases.PREPAREDNESS,
        activeYear: '2025',
        source: { riverBasin: 'Karnali' },
      };

      (prismaService.phase.create as jest.Mock).mockResolvedValue(
        mockCreatedPhase,
      );

      const result = await service.create(createPhaseDto);

      expect(result).toEqual(mockCreatedPhase);
      expect(prismaService.phase.create).toHaveBeenCalledWith({
        data: {
          name: createPhaseDto.name,
          source: {
            connectOrCreate: {
              create: {
                source: [createPhaseDto.source],
                riverBasin: createPhaseDto.river_basin,
              },
              where: {
                riverBasin: createPhaseDto.river_basin,
              },
            },
          },
          activeYear: createPhaseDto.activeYear,
          canRevert: createPhaseDto.canRevert,
          canTriggerPayout: createPhaseDto.canTriggerPayout,
          receivedMandatoryTriggers: createPhaseDto.receivedMandatoryTriggers,
          receivedOptionalTriggers: createPhaseDto.receivedOptionalTriggers,
          requiredMandatoryTriggers: createPhaseDto.requiredMandatoryTriggers,
          requiredOptionalTriggers: createPhaseDto.requiredOptionalTriggers,
        },
      });
    });

    it('should throw BadRequestException when activeYear is missing', async () => {
      const dtoWithoutActiveYear = { ...createPhaseDto };
      delete dtoWithoutActiveYear.activeYear;

      await expect(service.create(dtoWithoutActiveYear)).rejects.toThrow(
        new BadRequestException('Active year is required'),
      );
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database connection failed');
      (prismaService.phase.create as jest.Mock).mockRejectedValue(dbError);

      await expect(service.create(createPhaseDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('findAll', () => {
    const getPhaseDto: GetPhaseDto = {
      page: 1,
      perPage: 10,
      activeYear: '2025',
      riverBasin: 'Karnali',
      source: DataSource.DHM,
      name: Phases.PREPAREDNESS,
    };

    it('should return paginated phases with stats', async () => {
      const mockPaginatedData = [
        {
          uuid: 'test-uuid',
          name: Phases.PREPAREDNESS,
          source: { riverBasin: 'Karnali' },
        },
      ];

      mockPrismaService.phase.findMany.mockResolvedValue(mockPaginatedData);
      mockPrismaService.phase.count.mockResolvedValue(2);

      const mockPhaseStats = {
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      };

      jest
        .spyOn(service, 'generatePhaseTriggersStats')
        .mockResolvedValue(mockPhaseStats);

      const result = await service.findAll(getPhaseDto);
      expect(result.meta.total).toBe(2);
      expect(result.data.length).toBe(1);
      expect(result.data[0].phaseStats).toEqual(mockPhaseStats);
    });

    it('should handle undefined data gracefully', async () => {
      mockPrismaService.phase.findMany.mockResolvedValue(undefined);
      mockPrismaService.phase.count.mockResolvedValue(0);

      const result = await service.findAll(getPhaseDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('generatePhaseTriggersStats', () => {
    const phaseId = 'test-phase-id';

    it('should generate phase triggers stats successfully', async () => {
      const mockTriggers = [
        { uuid: 'trigger-1', isMandatory: true, isTriggered: true },
        { uuid: 'trigger-2', isMandatory: false, isTriggered: false },
      ];

      (prismaService.trigger.count as jest.Mock)
        .mockResolvedValueOnce(2) // totalMandatoryTriggers
        .mockResolvedValueOnce(1) // totalMandatoryTriggersTriggered
        .mockResolvedValueOnce(1) // totalOptionalTriggers
        .mockResolvedValueOnce(0); // totalOptionalTriggersTriggered

      (prismaService.trigger.findMany as jest.Mock).mockResolvedValue(
        mockTriggers,
      );

      const result = await service.generatePhaseTriggersStats(phaseId);

      expect(result).toEqual({
        triggers: mockTriggers,
        totalTriggers: 2,
        totalMandatoryTriggers: 2,
        totalMandatoryTriggersTriggered: 1,
        totalOptionalTriggers: 1,
        totalOptionalTriggersTriggered: 0,
      });
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.trigger.count as jest.Mock).mockRejectedValue(dbError);

      await expect(service.generatePhaseTriggersStats(phaseId)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('findOne', () => {
    const uuid = 'test-uuid';

    it('should return a phase by uuid', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        source: { riverBasin: 'Karnali' },
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );

      const result = await service.findOne(uuid);

      expect(result).toEqual(mockPhase);
      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid },
        include: { source: true },
      });
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      await expect(service.findOne(uuid)).rejects.toThrow(RpcException);
    });
  });

  describe('update', () => {
    const uuid = 'test-uuid';
    const updatePhaseDto: UpdatePhaseDto = {
      name: Phases.ACTIVATION,
      sourceId: 'source-uuid',
    };

    it('should update a phase successfully', async () => {
      const mockUpdatedPhase = {
        uuid,
        name: Phases.ACTIVATION,
        source: { uuid: 'source-uuid' },
      };

      (prismaService.phase.update as jest.Mock).mockResolvedValue(
        mockUpdatedPhase,
      );

      const result = await service.update(uuid, updatePhaseDto);

      expect(result).toEqual(mockUpdatedPhase);
      expect(prismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid },
        data: {
          name: updatePhaseDto.name,
          source: {
            connect: {
              uuid: updatePhaseDto.sourceId,
            },
          },
        },
      });
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.update as jest.Mock).mockRejectedValue(dbError);

      await expect(service.update(uuid, updatePhaseDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getOne', () => {
    const uuid = 'test-uuid';

    it('should return a phase with triggers and activities', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        requiredMandatoryTriggers: 2,
        requiredOptionalTriggers: 1,
        receivedMandatoryTriggers: 1,
        receivedOptionalTriggers: 0,
        Trigger: [
          { uuid: 'trigger-1', isMandatory: true },
          { uuid: 'trigger-2', isMandatory: false },
        ],
        source: { riverBasin: 'Karnali' },
        Activity: [],
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.trigger.count as jest.Mock)
        .mockResolvedValueOnce(2) // totalMandatoryTriggers
        .mockResolvedValueOnce(1); // totalOptionalTriggers

      const result = await service.getOne(uuid);

      expect(result).toEqual({
        ...mockPhase,
        triggerRequirements: {
          mandatoryTriggers: {
            totalTriggers: 2,
            requiredTriggers: 2,
            receivedTriggers: 1,
          },
          optionalTriggers: {
            totalTriggers: 1,
            requiredTriggers: 1,
            receivedTriggers: 0,
          },
        },
      });
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      await expect(service.getOne(uuid)).rejects.toThrow(RpcException);
    });
  });

  describe('getOneByDetail', () => {
    const getPhaseByName: GetPhaseByName = {
      appId: 'test-app',
      phase: Phases.PREPAREDNESS,
      uuid: 'test-uuid',
      activeYear: '2025',
      riverBasin: 'Karnali',
    };

    it('should return phase details by uuid', async () => {
      const mockPhase = {
        uuid: 'test-uuid',
        name: Phases.PREPAREDNESS,
        source: { riverBasin: 'Karnali' },
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.trigger.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.trigger.count as jest.Mock)
        .mockResolvedValueOnce(0) // totalMandatoryTriggers
        .mockResolvedValueOnce(0) // totalMandatoryTriggersTriggered
        .mockResolvedValueOnce(0) // totalOptionalTriggers
        .mockResolvedValueOnce(0); // totalOptionalTriggersTriggered

      const result = await service.getOneByDetail(getPhaseByName);

      expect(result).toEqual({
        ...mockPhase,
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      });

      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        include: { source: true },
      });
    });

    it('should return phase details by name, activeYear, and riverBasin', async () => {
      const getPhaseByNameWithoutUuid = {
        appId: 'test-app',
        phase: Phases.PREPAREDNESS,
        activeYear: '2025',
        riverBasin: 'Karnali',
      };

      const mockPhase = {
        uuid: 'test-uuid',
        name: Phases.PREPAREDNESS,
        source: { riverBasin: 'Karnali' },
      };

      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(mockPhase);
      (prismaService.trigger.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.trigger.count as jest.Mock)
        .mockResolvedValueOnce(0) // totalMandatoryTriggers
        .mockResolvedValueOnce(0) // totalMandatoryTriggersTriggered
        .mockResolvedValueOnce(0) // totalOptionalTriggers
        .mockResolvedValueOnce(0); // totalOptionalTriggersTriggered

      const result = await service.getOneByDetail(getPhaseByNameWithoutUuid);

      expect(result).toEqual({
        ...mockPhase,
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      });

      expect(prismaService.phase.findFirst).toHaveBeenCalledWith({
        where: {
          name: Phases.PREPAREDNESS,
          riverBasin: 'Karnali',
          activeYear: '2025',
          Activity: {
            some: {
              app: 'test-app',
            },
          },
        },
        include: { source: true },
      });
    });

    it('should throw RpcException when activeYear and riverBasin are missing', async () => {
      const invalidPayload = {
        appId: 'test-app',
        phase: Phases.PREPAREDNESS,
      };

      await expect(service.getOneByDetail(invalidPayload)).rejects.toThrow(
        new RpcException('Active year and river basin are required'),
      );
    });

    it('should throw RpcException when phase not found', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOneByDetail(getPhaseByName)).rejects.toThrow(
        new RpcException('Phase with uuid test-uuid not found'),
      );
    });

    it('should throw Error when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      await expect(service.getOneByDetail(getPhaseByName)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getPhaseBySource', () => {
    const source = DataSource.DHM;
    const riverBasin = 'Karnali';
    const phase = Phases.PREPAREDNESS;
    const activeYear = '2025';

    it('should return phase by source and riverBasin', async () => {
      const mockPhase = {
        uuid: 'test-uuid',
        name: phase,
        source: { riverBasin },
        activeYear,
      };

      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(mockPhase);

      const result = await service.getPhaseBySource(
        source,
        riverBasin,
        phase,
        activeYear,
      );

      expect(result).toEqual(mockPhase);
      expect(prismaService.phase.findFirst).toHaveBeenCalledWith({
        where: {
          source: { riverBasin },
          activeYear,
        },
        include: { source: true },
        orderBy: { activeYear: 'desc' },
      });
    });

    it('should return phase without activeYear filter', async () => {
      const mockPhase = {
        uuid: 'test-uuid',
        name: phase,
        source: { riverBasin },
      };

      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(mockPhase);

      const result = await service.getPhaseBySource(source, riverBasin, phase);

      expect(result).toEqual(mockPhase);
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findFirst as jest.Mock).mockRejectedValue(dbError);

      await expect(
        service.getPhaseBySource(source, riverBasin, phase, activeYear),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('getAppIdByPhase', () => {
    const phaseId = 'test-phase-id';

    it('should return unique app IDs for a phase', async () => {
      const mockPhase = {
        uuid: phaseId,
        Activity: [
          { app: 'app-1' },
          { app: 'app-2' },
          { app: 'app-1' }, // duplicate
        ],
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );

      const result = await service.getAppIdByPhase(phaseId);

      expect(result).toEqual(['app-1', 'app-2']);
      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid: phaseId },
        include: {
          Activity: {
            where: {
              isDeleted: false,
            },
          },
        },
      });
    });
  });

  describe('activatePhase', () => {
    const uuid = 'test-uuid';

    it('should activate phase successfully', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        canTriggerPayout: true,
        source: { riverBasin: 'Karnali' },
        Activity: [
          {
            uuid: 'activity-1',
            app: 'app-1',
            activityCommunication: [{ communicationId: 'comm-1' }],
          },
        ],
      };

      const mockAppIds = ['app-1'];
      const mockDisbursementResult = { success: true };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      jest.spyOn(service, 'getAppIdByPhase').mockResolvedValue(mockAppIds);
      (clientProxy.send as jest.Mock).mockReturnValue(
        of(mockDisbursementResult),
      );
      (prismaService.activity.update as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: true,
      });

      const result = await service.activatePhase(uuid);

      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid },
        include: {
          source: true,
          Activity: {
            where: {
              isAutomated: true,
              status: {
                not: ActivityStatus.COMPLETED,
              },
              isDeleted: false,
            },
          },
        },
      });

      expect(communicationQueue.add).toHaveBeenCalledWith(
        JOBS.ACTIVITIES.COMMUNICATION.TRIGGER,
        {
          communicationId: 'comm-1',
          activityId: 'activity-1',
          appId: 'app-1',
        },
        expect.any(Object),
      );

      expect(clientProxy.send).toHaveBeenCalledWith(
        { cmd: JOBS.STELLAR.DISBURSE, uuid: 'app-1' },
        { dName: expect.stringContaining('PREPAREDNESS-Karnali-') },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_ACTIVATED, {
        phaseId: uuid,
      });
    });

    it('should activate phase without payout trigger', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        canTriggerPayout: false,
        source: { riverBasin: 'Karnali' },
        Activity: [
          {
            uuid: 'activity-1',
            app: 'app-1',
            activityCommunication: [{ communicationId: 'comm-1' }],
          },
        ],
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.activity.update as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: true,
      });

      const result = await service.activatePhase(uuid);

      expect(clientProxy.send).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_ACTIVATED, {
        phaseId: uuid,
      });
    });

    it('should handle database errors gracefully and return undefined', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      const result = await service.activatePhase(uuid);

      expect(result).toBeUndefined();
    });

    it('should handle phase not found and return undefined', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.activatePhase(uuid);

      expect(result).toBeUndefined();
    });
  });

  describe('addTriggersToPhases', () => {
    const payload = {
      uuid: 'test-uuid',
      triggers: [
        { repeatKey: 'trigger-1', isMandatory: true },
        { repeatKey: 'trigger-2', isMandatory: false },
      ],
      triggerRequirements: {
        mandatoryTriggers: { requiredTriggers: 2 },
        optionalTriggers: { requiredTriggers: 1 },
      },
    };

    it('should add triggers to phase successfully', async () => {
      const mockPhase = {
        uuid: 'test-uuid',
        isActive: false,
      };

      const mockTrigger = {
        uuid: 'trigger-uuid',
        repeatKey: 'trigger-1',
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.trigger.findUnique as jest.Mock).mockResolvedValue(
        mockTrigger,
      );
      (prismaService.trigger.update as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        requiredMandatoryTriggers: 2,
      });

      const result = await service.addTriggersToPhases(payload);

      expect(prismaService.trigger.update).toHaveBeenCalledTimes(2);
      expect(prismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        data: {
          requiredMandatoryTriggers: 2,
          requiredOptionalTriggers: 1,
        },
      });
    });

    it('should throw RpcException when phase not found', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.addTriggersToPhases(payload)).rejects.toThrow(
        new RpcException('Phase with uuid test-uuid not found'),
      );
    });

    it('should throw BadRequestException when phase is active', async () => {
      const mockPhase = {
        uuid: 'test-uuid',
        isActive: true,
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );

      await expect(service.addTriggersToPhases(payload)).rejects.toThrow(
        new BadRequestException('Cannot add triggers to an active phase.'),
      );
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      await expect(service.addTriggersToPhases(payload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('revertPhase', () => {
    const appId = 'test-app';
    const phaseId = 'test-phase-id';

    it('should revert phase successfully', async () => {
      const mockActivities = [
        {
          uuid: 'activity-1',
          completedAt: new Date('2025-01-01T10:00:00Z'),
          phase: { activatedAt: new Date('2025-01-01T09:00:00Z') },
          differenceInTriggerAndActivityCompletion: null,
          status: ActivityStatus.COMPLETED,
          isDeleted: false,
        },
      ];

      const mockPhase = {
        uuid: phaseId,
        isActive: true,
        canRevert: true,
        Trigger: [
          {
            uuid: 'trigger-1',
            repeatKey: 'trigger-1',
            title: 'Test Trigger',
            description: 'Test Description',
            isMandatory: true,
            phaseId,
            source: DataSource.MANUAL,
            createdBy: 'user-1',
          },
        ],
      };

      (prismaService.activity.findMany as jest.Mock).mockResolvedValue(
        mockActivities,
      );
      (prismaService.activity.update as jest.Mock).mockResolvedValue({});
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (triggerService.create as jest.Mock).mockResolvedValue({});
      (triggerService.archive as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: false,
      });

      const result = await service.revertPhase(appId, phaseId);

      expect(prismaService.activity.findMany).toHaveBeenCalledWith({
        where: {
          differenceInTriggerAndActivityCompletion: null,
          status: ActivityStatus.COMPLETED,
          isDeleted: false,
        },
        include: {
          phase: true,
        },
      });

      expect(triggerService.create).toHaveBeenCalledWith(
        appId,
        {
          title: 'Test Trigger',
          description: 'Test Description',
          isMandatory: true,
          phaseId,
          source: DataSource.MANUAL,
        },
        'user-1',
      );

      expect(triggerService.archive).toHaveBeenCalledWith('trigger-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_REVERTED, {
        phaseId,
        revertedAt: expect.any(String),
      });
    });

    it('should handle non-manual triggers', async () => {
      const mockPhase = {
        uuid: phaseId,
        isActive: true,
        canRevert: true,
        Trigger: [
          {
            uuid: 'trigger-1',
            repeatKey: 'trigger-1',
            title: 'Test Trigger',
            description: 'Test Description',
            isMandatory: true,
            phaseId,
            source: DataSource.DHM,
            triggerStatement: { condition: 'test' },
            createdBy: 'user-1',
          },
        ],
      };

      (prismaService.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (triggerService.create as jest.Mock).mockResolvedValue({});
      (triggerService.archive as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: false,
      });

      await service.revertPhase(appId, phaseId);

      expect(triggerService.create).toHaveBeenCalledWith(
        appId,
        {
          title: 'Test Trigger',
          description: 'Test Description',
          triggerStatement: { condition: 'test' },
          isMandatory: true,
          phaseId,
          source: DataSource.DHM,
        },
        'user-1',
      );
    });

    it('should throw RpcException when phase not found', async () => {
      (prismaService.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.revertPhase(appId, phaseId)).rejects.toThrow(
        new RpcException('Phase not found.'),
      );
    });

    it('should throw RpcException when phase cannot be reverted', async () => {
      const mockPhase = {
        uuid: phaseId,
        isActive: false,
        canRevert: false,
        Trigger: [],
      };

      (prismaService.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );

      await expect(service.revertPhase(appId, phaseId)).rejects.toThrow(
        new RpcException('Phase cannot be reverted.'),
      );
    });
  });

  describe('findByLocation', () => {
    const river_basin = 'Karnali';
    const activeYear = '2025';

    it('should return phases by location', async () => {
      const mockPhases = [
        { uuid: 'phase-1', name: Phases.PREPAREDNESS },
        { uuid: 'phase-2', name: Phases.ACTIVATION },
      ];

      (prismaService.phase.findMany as jest.Mock).mockResolvedValue(mockPhases);

      const result = await service.findByLocation(river_basin, activeYear);

      expect(result).toEqual(mockPhases);
      expect(prismaService.phase.findMany).toHaveBeenCalledWith({
        where: {
          activeYear,
          source: {
            riverBasin: {
              contains: river_basin,
              mode: 'insensitive',
            },
          },
        },
      });
    });

    it('should return phases without activeYear filter', async () => {
      const mockPhases = [{ uuid: 'phase-1', name: Phases.PREPAREDNESS }];

      (prismaService.phase.findMany as jest.Mock).mockResolvedValue(mockPhases);

      const result = await service.findByLocation(river_basin);

      expect(result).toEqual(mockPhases);
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findMany as jest.Mock).mockRejectedValue(dbError);

      await expect(
        service.findByLocation(river_basin, activeYear),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('configurePhaseThreshold', () => {
    const configureThresholdDto: ConfigureThresholdPhaseDto = {
      uuid: 'test-uuid',
      requiredMandatoryTriggers: 3,
      requiredOptionalTriggers: 2,
    };

    it('should configure phase threshold successfully', async () => {
      const mockUpdatedPhase = {
        uuid: 'test-uuid',
        requiredMandatoryTriggers: 3,
        requiredOptionalTriggers: 2,
      };

      (prismaService.phase.update as jest.Mock).mockResolvedValue(
        mockUpdatedPhase,
      );

      const result = await service.configurePhaseThreshold(
        configureThresholdDto,
      );

      expect(result).toEqual(mockUpdatedPhase);
      expect(prismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: configureThresholdDto.uuid },
        data: {
          requiredOptionalTriggers:
            configureThresholdDto.requiredOptionalTriggers,
          requiredMandatoryTriggers:
            configureThresholdDto.requiredMandatoryTriggers,
        },
      });
    });
  });
});
