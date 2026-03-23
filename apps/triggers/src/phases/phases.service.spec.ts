jest.mock('cheerio', () => ({
  load: jest.fn().mockReturnValue({
    text: jest.fn(),
    html: jest.fn(),
  }),
}));

// Mock the paginator function
const mockPaginateFn = jest.fn();
jest.mock('@lib/database', () => ({
  ...jest.requireActual('@lib/database'),
  paginator: jest.fn(() => mockPaginateFn),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PrismaService,
  ActivityStatus,
  DataSource,
  Phases,
} from '@lib/database';
import type { Queue } from 'bull';
import { BadRequestException } from '@nestjs/common';
import { PhasesService } from './phases.service';
import { TriggerService } from 'src/trigger/trigger.service';
import { MS_TRIGGER_CLIENTS, BQUEUE, EVENTS, JOBS } from 'src/constant';
import {
  CreatePhaseDto,
  UpdatePhaseDto,
  GetPhaseDto,
  GetPhaseByDetailDto,
  ConfigureThresholdPhaseDto,
} from './dto';
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
      count: jest.fn(),
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
    createTrigger: jest.fn(),
    generateTriggersStatsForPhase: jest.fn(),
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
        },
      });
    });

    it('should throw BadRequestException when activeYear is missing', async () => {
      const dtoWithoutActiveYear = { ...createPhaseDto };
      delete dtoWithoutActiveYear.activeYear;

      await expect(service.create(dtoWithoutActiveYear)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when name is missing', async () => {
      await expect(
        service.create({ ...createPhaseDto, name: undefined }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException when river_basin is missing', async () => {
      await expect(
        service.create({ ...createPhaseDto, river_basin: undefined }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException when duplicate phase exists', async () => {
      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue({
        uuid: 'existing-uuid',
        name: createPhaseDto.name,
        activeYear: createPhaseDto.activeYear,
        riverBasin: createPhaseDto.river_basin,
      });

      await expect(service.create(createPhaseDto)).rejects.toThrow(
        RpcException,
      );
      await expect(service.create(createPhaseDto)).rejects.toThrow(
        `Phase with name ${createPhaseDto.name}, activeYear ${createPhaseDto.activeYear} and riverBasin ${createPhaseDto.river_basin} already exists`,
      );
    });

    it('should throw RpcException when another phase with canTriggerPayout=true exists for same riverBasin', async () => {
      const payloadWithPayout: CreatePhaseDto = {
        ...createPhaseDto,
        canTriggerPayout: true,
      };

      (prismaService.phase.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no duplicate phase
        .mockResolvedValueOnce({
          // payout conflict found
          uuid: 'other-uuid',
          name: Phases.READINESS,
          activeYear: '2025',
          canTriggerPayout: true,
          riverBasin: 'Karnali',
        });

      await expect(service.create(payloadWithPayout)).rejects.toThrow(
        /already has payout enabled/,
      );
    });

    it('should NOT call validateSinglePayoutPhase when canTriggerPayout is false', async () => {
      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.phase.create as jest.Mock).mockResolvedValue({});

      const validateSpy = jest.spyOn(
        service as any,
        'validateSinglePayoutPhase',
      );

      await service.create({ ...createPhaseDto, canTriggerPayout: false });

      expect(validateSpy).not.toHaveBeenCalled();
    });

    it('should call validateSinglePayoutPhase with riverBasin when canTriggerPayout is true', async () => {
      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.phase.create as jest.Mock).mockResolvedValue({});

      const validateSpy = jest
        .spyOn(service as any, 'validateSinglePayoutPhase')
        .mockResolvedValue(undefined);

      await service.create({ ...createPhaseDto, canTriggerPayout: true });

      expect(validateSpy).toHaveBeenCalledWith(createPhaseDto.river_basin);
    });

    it('should throw RpcException when database error occurs', async () => {
      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(null);
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
      name: Phases.PREPAREDNESS,
    };

    it('should return paginated phases with stats', async () => {
      const mockPaginatedData = {
        data: [
          {
            uuid: 'test-uuid',
            name: Phases.PREPAREDNESS,
            source: { riverBasin: 'Karnali' },
            Trigger: [],
          },
        ],
        meta: {
          total: 2,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      const mockPhaseStats = {
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      };

      mockPaginateFn.mockResolvedValue(mockPaginatedData);
      (
        triggerService.generateTriggersStatsForPhase as jest.Mock
      ).mockResolvedValue(mockPhaseStats);

      const result = await service.findAll(getPhaseDto);
      expect(result.data.length).toBe(1);
      expect(result.data[0].phaseStats).toEqual(mockPhaseStats);
      expect(triggerService.generateTriggersStatsForPhase).toHaveBeenCalledWith(
        'test-uuid',
      );
    });

    it('should handle undefined data gracefully', async () => {
      const mockPaginatedData = {
        data: undefined,
        meta: {
          total: 0,
          lastPage: 0,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      mockPaginateFn.mockResolvedValue(mockPaginatedData);

      const result = await service.findAll(getPhaseDto);

      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    const uuid = 'test-uuid';

    it('should return a phase by uuid with trigger requirements', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        source: { riverBasin: 'Karnali' },
        requiredMandatoryTriggers: 2,
        requiredOptionalTriggers: 1,
        receivedMandatoryTriggers: 1,
        receivedOptionalTriggers: 0,
      };

      const mockTriggerStats = {
        totalMandatoryTriggers: 2,
        totalOptionalTriggers: 1,
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (
        triggerService.generateTriggersStatsForPhase as jest.Mock
      ).mockResolvedValue(mockTriggerStats);

      const result = await service.findOne(uuid);

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
      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid },
      });
      expect(triggerService.generateTriggersStatsForPhase).toHaveBeenCalledWith(
        uuid,
      );
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findUnique as jest.Mock).mockRejectedValue(dbError);

      await expect(service.findOne(uuid)).rejects.toThrow(RpcException);
    });
  });

  describe('update', () => {
    const mockExistingPhase = {
      uuid: 'test-uuid',
      name: Phases.ACTIVATION,
      riverBasin: 'Karnali',
      activeYear: '2025',
      canRevert: false,
      canTriggerPayout: false,
      isActive: false,
      requiredMandatoryTriggers: 2,
      requiredOptionalTriggers: 2,
    };

    beforeEach(() => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockExistingPhase,
      );
      (prismaService.phase.update as jest.Mock).mockResolvedValue(
        mockExistingPhase,
      );
    });

    it('should update only allowed fields (name, canRevert, canTriggerPayout, requiredMandatoryTriggers, requiredOptionalTriggers)', async () => {
      const payload: UpdatePhaseDto = {
        uuid: 'test-uuid',
        name: Phases.READINESS,
        canRevert: true,
        canTriggerPayout: false,
        requiredMandatoryTriggers: 2,
        requiredOptionalTriggers: 2,
      };

      const result = await service.update(payload);

      expect(prismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        data: {
          name: Phases.READINESS,
          canRevert: true,
          canTriggerPayout: false,
          requiredMandatoryTriggers: 2,
          requiredOptionalTriggers: 2,
        },
      });
      expect(result).toEqual(mockExistingPhase);
    });

    it('should fallback to existing phase values for fields not in payload', async () => {
      const payload: UpdatePhaseDto = {
        uuid: 'test-uuid',
        name: Phases.READINESS,
      };

      await service.update(payload);

      expect(prismaService.phase.update).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        data: {
          name: Phases.READINESS,
          canRevert: mockExistingPhase.canRevert,
          canTriggerPayout: mockExistingPhase.canTriggerPayout,
          requiredMandatoryTriggers:
            mockExistingPhase.requiredMandatoryTriggers,
          requiredOptionalTriggers: mockExistingPhase.requiredOptionalTriggers,
        },
      });
    });

    it('should allow explicitly setting canRevert to false', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue({
        ...mockExistingPhase,
        canRevert: true,
      });

      const payload: UpdatePhaseDto = { uuid: 'test-uuid', canRevert: false };

      await service.update(payload);

      expect(prismaService.phase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ canRevert: false }),
        }),
      );
    });

    it('should allow explicitly setting canTriggerPayout to false', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue({
        ...mockExistingPhase,
        canTriggerPayout: true,
      });

      const payload: UpdatePhaseDto = {
        uuid: 'test-uuid',
        canTriggerPayout: false,
      };

      await service.update(payload);

      expect(prismaService.phase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ canTriggerPayout: false }),
        }),
      );
    });

    it('should call validateSinglePayoutPhase with riverBasin and excludeUuid when canTriggerPayout is true', async () => {
      const validateSpy = jest
        .spyOn(service as any, 'validateSinglePayoutPhase')
        .mockResolvedValue(undefined);

      const payload: UpdatePhaseDto = {
        uuid: 'test-uuid',
        canTriggerPayout: true,
      };

      await service.update(payload);

      expect(validateSpy).toHaveBeenCalledWith(
        mockExistingPhase.riverBasin,
        'test-uuid',
      );
    });

    it('should NOT call validateSinglePayoutPhase when canTriggerPayout is false', async () => {
      const validateSpy = jest.spyOn(
        service as any,
        'validateSinglePayoutPhase',
      );

      const payload: UpdatePhaseDto = {
        uuid: 'test-uuid',
        canTriggerPayout: false,
      };

      await service.update(payload);

      expect(validateSpy).not.toHaveBeenCalled();
    });

    it('should throw RpcException when phase is not found', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update({ uuid: 'non-existent', name: Phases.READINESS }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException when prisma.phase.update fails', async () => {
      (prismaService.phase.update as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.update({ uuid: 'test-uuid', name: Phases.READINESS }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException when trying to update an active phase', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue({
        uuid: 'test-uuid',
        name: Phases.ACTIVATION,
        riverBasin: 'Karnali',
        activeYear: '2025',
        canRevert: false,
        canTriggerPayout: false,
        isActive: true,
      });

      await expect(
        service.update({ uuid: 'test-uuid', name: Phases.READINESS }),
      ).rejects.toThrow(RpcException);
      await expect(
        service.update({ uuid: 'test-uuid', name: Phases.READINESS }),
      ).rejects.toThrow('Cannot update an active phase');
    });
  });

  describe('getOneByDetail', () => {
    const getPhaseByName: GetPhaseByDetailDto = {
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

      const mockTriggerStats = {
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      };

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (
        triggerService.generateTriggersStatsForPhase as jest.Mock
      ).mockResolvedValue(mockTriggerStats);

      const result = await service.getOneByDetail(getPhaseByName);

      expect(result).toEqual({
        ...mockPhase,
        ...mockTriggerStats,
      });

      expect(prismaService.phase.findUnique).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        include: { source: true },
      });
      expect(triggerService.generateTriggersStatsForPhase).toHaveBeenCalledWith(
        'test-uuid',
      );
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

      const mockTriggerStats = {
        triggers: [],
        totalTriggers: 0,
        totalMandatoryTriggers: 0,
        totalMandatoryTriggersTriggered: 0,
        totalOptionalTriggers: 0,
        totalOptionalTriggersTriggered: 0,
      };

      (prismaService.phase.findFirst as jest.Mock).mockResolvedValue(mockPhase);
      (
        triggerService.generateTriggersStatsForPhase as jest.Mock
      ).mockResolvedValue(mockTriggerStats);

      const result = await service.getOneByDetail(getPhaseByNameWithoutUuid);

      expect(result).toEqual({
        ...mockPhase,
        ...mockTriggerStats,
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
      expect(triggerService.generateTriggersStatsForPhase).toHaveBeenCalledWith(
        'test-uuid',
      );
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
        activeYear: '2025',
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

      await service.activatePhase(uuid);

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
        { cmd: JOBS.CHAIN.DISBURSE, uuid: 'app-1' },
        { dName: expect.stringContaining('PREPAREDNESS-Karnali-') },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_ACTIVATED, {
        phaseId: uuid,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION.CREATE,
        expect.objectContaining({
          payload: expect.objectContaining({
            title: expect.stringContaining('Phase Activated for Karnali'),
          }),
        }),
      );
    });

    it('should activate phase without payout trigger', async () => {
      const mockPhase = {
        uuid,
        name: Phases.PREPAREDNESS,
        canTriggerPayout: false,
        source: { riverBasin: 'Karnali' },
        activeYear: '2025',
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

      await service.activatePhase(uuid);

      expect(clientProxy.send).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_ACTIVATED, {
        phaseId: uuid,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.NOTIFICATION.CREATE,
        expect.objectContaining({
          payload: expect.objectContaining({
            title: expect.stringContaining('Phase Activated for Karnali'),
          }),
        }),
      );
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
        { uuid: 'trigger-1', isMandatory: true },
        { uuid: 'trigger-2', isMandatory: false },
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

      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.trigger.update as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        requiredMandatoryTriggers: 2,
      });

      await service.addTriggersToPhases(payload);

      expect(prismaService.trigger.update).toHaveBeenCalledTimes(2);
      expect(prismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: 'trigger-1' },
        data: {
          isMandatory: true,
          phaseId: 'test-uuid',
        },
      });
      expect(prismaService.trigger.update).toHaveBeenCalledWith({
        where: { uuid: 'trigger-2' },
        data: {
          isMandatory: false,
          phaseId: 'test-uuid',
        },
      });
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
    const payload = {
      appId: 'test-app',
      phaseId: 'test-phase-id',
    };

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
        uuid: payload.phaseId,
        isActive: true,
        canRevert: true,
        Trigger: [
          {
            uuid: 'trigger-1',
            repeatKey: 'trigger-1',
            title: 'Test Trigger',
            description: 'Test Description',
            isMandatory: true,
            phaseId: payload.phaseId,
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
      (triggerService.createTrigger as jest.Mock).mockResolvedValue({});
      (triggerService.archive as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: false,
      });

      await service.revertPhase(payload);

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

      expect(triggerService.createTrigger).toHaveBeenCalledWith(
        payload.appId,
        {
          title: 'Test Trigger',
          description: 'Test Description',
          isMandatory: true,
          phaseId: payload.phaseId,
          source: DataSource.MANUAL,
        },
        'user-1',
      );

      expect(triggerService.archive).toHaveBeenCalledWith('trigger-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.PHASE_REVERTED, {
        phaseId: payload.phaseId,
        revertedAt: expect.any(String),
      });
    });

    it('should handle non-manual triggers', async () => {
      const mockPhase = {
        uuid: payload.phaseId,
        isActive: true,
        canRevert: true,
        Trigger: [
          {
            uuid: 'trigger-1',
            repeatKey: 'trigger-1',
            title: 'Test Trigger',
            description: 'Test Description',
            isMandatory: true,
            phaseId: payload.phaseId,
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
      (triggerService.createTrigger as jest.Mock).mockResolvedValue({});
      (triggerService.archive as jest.Mock).mockResolvedValue({});
      (prismaService.phase.update as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: false,
      });

      await service.revertPhase(payload);

      expect(triggerService.createTrigger).toHaveBeenCalledWith(
        payload.appId,
        {
          title: 'Test Trigger',
          description: 'Test Description',
          triggerStatement: { condition: 'test' },
          isMandatory: true,
          phaseId: payload.phaseId,
          source: DataSource.DHM,
        },
        'user-1',
      );
    });

    it('should throw RpcException when phase not found', async () => {
      (prismaService.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.revertPhase(payload)).rejects.toThrow(
        new RpcException('Phase not found.'),
      );
    });

    it('should throw RpcException when phase cannot be reverted', async () => {
      const mockPhase = {
        uuid: payload.phaseId,
        isActive: false,
        canRevert: false,
        Trigger: [],
      };

      (prismaService.activity.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );

      await expect(service.revertPhase(payload)).rejects.toThrow(
        new RpcException('Phase cannot be reverted.'),
      );
    });
  });

  describe('findByLocation', () => {
    const payload = {
      riverBasin: 'Karnali',
      activeYear: '2025',
    };

    it('should return phases by location', async () => {
      const mockPhases = [
        { uuid: 'phase-1', name: Phases.PREPAREDNESS },
        { uuid: 'phase-2', name: Phases.ACTIVATION },
      ];

      (prismaService.phase.findMany as jest.Mock).mockResolvedValue(mockPhases);

      const result = await service.findByLocation(payload);

      expect(result).toEqual(mockPhases);
      expect(prismaService.phase.findMany).toHaveBeenCalledWith({
        where: {
          activeYear: payload.activeYear,
          source: {
            riverBasin: {
              contains: payload.riverBasin,
              mode: 'insensitive',
            },
          },
        },
      });
    });

    it('should return phases without activeYear filter', async () => {
      const payloadWithoutYear = {
        riverBasin: 'Karnali',
      };
      const mockPhases = [{ uuid: 'phase-1', name: Phases.PREPAREDNESS }];

      (prismaService.phase.findMany as jest.Mock).mockResolvedValue(mockPhases);

      const result = await service.findByLocation(payloadWithoutYear);

      expect(result).toEqual(mockPhases);
    });

    it('should throw RpcException when database error occurs', async () => {
      const dbError = new Error('Database error');
      (prismaService.phase.findMany as jest.Mock).mockRejectedValue(dbError);

      await expect(service.findByLocation(payload)).rejects.toThrow(
        RpcException,
      );
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

  describe('delete', () => {
    const mockPhase = {
      uuid: 'test-uuid',
      name: Phases.ACTIVATION,
      activeYear: '2025',
      riverBasin: 'Karnali',
      isActive: false,
      canTriggerPayout: false,
    };

    beforeEach(() => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(
        mockPhase,
      );
      (prismaService.trigger.count as jest.Mock).mockResolvedValue(0);
      (prismaService.activity.count as jest.Mock).mockResolvedValue(0);
      (prismaService.phase.delete as jest.Mock).mockResolvedValue(mockPhase);
    });

    it('should delete phase successfully when no triggers or activities exist', async () => {
      const result = await service.delete('test-uuid');

      expect(prismaService.phase.delete).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
      });
      expect(result).toEqual(mockPhase);
    });

    it('should check trigger count with isDeleted: false', async () => {
      await service.delete('test-uuid');

      expect(prismaService.trigger.count).toHaveBeenCalledWith({
        where: { phaseId: 'test-uuid', isDeleted: false },
      });
    });

    it('should check activity count with isDeleted: false', async () => {
      await service.delete('test-uuid');

      expect(prismaService.activity.count).toHaveBeenCalledWith({
        where: { phaseId: 'test-uuid', isDeleted: false },
      });
    });

    it('should run trigger and activity count checks in parallel', async () => {
      const triggerCountSpy = jest.spyOn(prismaService.trigger, 'count');
      const activityCountSpy = jest.spyOn(prismaService.activity, 'count');

      await service.delete('test-uuid');

      expect(triggerCountSpy).toHaveBeenCalledTimes(1);
      expect(activityCountSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw RpcException when phase is not found', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('non-existent-uuid')).rejects.toThrow(
        RpcException,
      );
      await expect(service.delete('non-existent-uuid')).rejects.toThrow(
        'Phase with uuid non-existent-uuid not found',
      );
    });

    it('should throw RpcException when phase is active', async () => {
      (prismaService.phase.findUnique as jest.Mock).mockResolvedValue({
        ...mockPhase,
        isActive: true,
      });

      await expect(service.delete('test-uuid')).rejects.toThrow(RpcException);
      await expect(service.delete('test-uuid')).rejects.toThrow(
        'Cannot delete an active phase',
      );
    });

    it('should throw RpcException with trigger count when triggers exist', async () => {
      (prismaService.trigger.count as jest.Mock).mockResolvedValue(3);

      await expect(service.delete('test-uuid')).rejects.toThrow(RpcException);
      await expect(service.delete('test-uuid')).rejects.toThrow(
        /3 trigger\(s\) are associated with it/,
      );
    });

    it('should throw RpcException with activity count when activities exist', async () => {
      (prismaService.activity.count as jest.Mock).mockResolvedValue(2);

      await expect(service.delete('test-uuid')).rejects.toThrow(RpcException);
      await expect(service.delete('test-uuid')).rejects.toThrow(
        /2 activity\(s\) are associated with it/,
      );
    });

    it('should include phase name and activeYear in trigger error message', async () => {
      (prismaService.trigger.count as jest.Mock).mockResolvedValue(1);

      await expect(service.delete('test-uuid')).rejects.toThrow(
        `Cannot delete phase "${mockPhase.name}" (${mockPhase.activeYear})`,
      );
    });

    it('should include phase name and activeYear in activity error message', async () => {
      (prismaService.activity.count as jest.Mock).mockResolvedValue(1);

      await expect(service.delete('test-uuid')).rejects.toThrow(
        `Cannot delete phase "${mockPhase.name}" (${mockPhase.activeYear})`,
      );
    });

    it('should prioritize trigger error over activity error when both exist', async () => {
      (prismaService.trigger.count as jest.Mock).mockResolvedValue(2);
      (prismaService.activity.count as jest.Mock).mockResolvedValue(3);

      await expect(service.delete('test-uuid')).rejects.toThrow(
        /trigger\(s\) are associated with it/,
      );
    });

    it('should throw RpcException when prisma.phase.delete fails', async () => {
      (prismaService.phase.delete as jest.Mock).mockRejectedValue(
        new Error('DB constraint violation'),
      );

      await expect(service.delete('test-uuid')).rejects.toThrow(RpcException);
    });
  });
});
