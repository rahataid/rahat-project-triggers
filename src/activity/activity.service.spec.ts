import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ActivityStatus } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import { of } from 'rxjs';
import { ActivityService } from './activity.service';
import { MS_TRIGGER_CLIENTS } from 'src/constant';
import {
  CreateActivityDto,
  GetActivityDto,
  GetActivityHavingCommsDto,
  UpdateActivityDto,
} from './dto';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockPrismaService: any;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockClientProxy: jest.Mocked<ClientProxy>;
  let mockCommsClient: jest.Mocked<any>;

  const mockPrismaServiceImplementation = {
    activity: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activityCommunication: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activityPayout: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activityDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    phase: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  const mockEventEmitterImplementation = {
    emit: jest.fn(),
  };

  const mockClientProxyImplementation = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  const mockCommsClientImplementation = {
    send: jest.fn(),
    emit: jest.fn(),
    session: {
      get: jest.fn(),
      broadcastCount: jest.fn(),
    },
    transport: {
      get: jest.fn(),
    },
    broadcast: {
      getReport: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceImplementation,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitterImplementation,
        },
        {
          provide: MS_TRIGGER_CLIENTS.RAHAT,
          useValue: mockClientProxyImplementation,
        },
        {
          provide: 'COMMS_CLIENT',
          useValue: mockCommsClientImplementation,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    mockPrismaService = module.get(PrismaService);
    mockEventEmitter = module.get(EventEmitter2);
    mockClientProxy = module.get(MS_TRIGGER_CLIENTS.RAHAT);
    mockCommsClient = module.get('COMMS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    const mockCreateActivityDto: CreateActivityDto = {
      title: 'Test Activity',
      leadTime: '2023-12-31',
      responsibility: 'Test Responsibility',
      phaseId: 'phase-uuid',
      categoryId: 'category-uuid',
      description: 'Test Description',
      appId: 'app-id',
      manager: {
        id: 'manager-id',
        name: 'Test Manager',
        email: 'test@example.com',
        phone: '1234567890',
      },
      activityCommunication: [
        {
          type: 'SMS',
          message: 'Test message',
          groupType: 'BENEFICIARY',
          groupId: 'group-id',
        },
      ],
      activityPayout: [
        {
          amount: 100,
          currency: 'USD',
        },
      ],
      activityDocuments: {
        document1: 'content1',
      },
    };

    it('should successfully create an activity with all components', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
      };

      mockPrismaService.activity.create.mockResolvedValue(mockActivity);
      mockEventEmitter.emit.mockReturnValue(undefined);

      const result = await service.add(mockCreateActivityDto);

      expect(mockPrismaService.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Activity',
          description: 'Test Description',
          leadTime: '2023-12-31',
          app: 'app-id',
          manager: {
            connectOrCreate: {
              where: { id: 'manager-id' },
              create: {
                id: 'manager-id',
                name: 'Test Manager',
                email: 'test@example.com',
                phone: '1234567890',
              },
            },
          },
          category: { connect: { uuid: 'category-uuid' } },
          phase: { connect: { uuid: 'phase-uuid' } },
        }),
        include: { manager: true },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalled();
      expect(result).toEqual(mockActivity);
    });

    it('should handle activity creation without optional components', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
      };

      const minimalDto: CreateActivityDto = {
        title: 'Test Activity',
        leadTime: '2023-12-31',
        responsibility: 'Test Responsibility',
        phaseId: 'phase-uuid',
        categoryId: 'category-uuid',
        appId: 'app-id',
      };

      mockPrismaService.activity.create.mockResolvedValue(mockActivity);

      const result = await service.add(minimalDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Activity',
          app: 'app-id',
        }),
        include: { manager: true },
      });
    });
  });

  describe('getOne', () => {
    const mockPayload = {
      uuid: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully retrieve an activity', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
        activityCommunication: [],
        app: 'app-id',
        category: { id: 1, name: 'Test Category' },
        phase: { id: 1, name: 'Test Phase', source: { id: 1 } },
        manager: { id: 1, name: 'Test Manager' },
      };

      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);

      const result = await service.getOne(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        include: {
          category: true,
          phase: { include: { source: true } },
          manager: true,
        },
      });
      expect(result).toEqual({
        ...mockActivity,
        activityCommunication: [],
        activityPayout: [],
      });
    });

    it('should return empty arrays when activity not found', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      const result = await service.getOne(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        include: {
          category: true,
          phase: { include: { source: true } },
          manager: true,
        },
      });
      expect(result).toEqual({
        activityCommunication: [],
        activityPayout: [],
      });
    });
  });

  describe('getAll', () => {
    const mockPayload: GetActivityDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      managerId: 'manager-uuid',
    };

    it('should successfully retrieve all activities', async () => {
      const mockActivities = [
        {
          id: 1,
          uuid: 'activity-uuid-1',
          title: 'Activity 1',
        },
        {
          id: 2,
          uuid: 'activity-uuid-2',
          title: 'Activity 2',
        },
      ];

      const mockPaginatedResult = {
        data: mockActivities,
        meta: {
          total: 2,
          page: 1,
          perPage: 10,
        },
      };

      mockPrismaService.activity.findMany.mockResolvedValue(mockActivities);
      mockPrismaService.activity.count.mockResolvedValue(2);

      const result = await service.getAll(mockPayload);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle filtering by status', async () => {
      const payloadWithStatus = {
        ...mockPayload,
        status: ActivityStatus.WORK_IN_PROGRESS,
      };

      mockPrismaService.activity.findMany.mockResolvedValue([]);
      mockPrismaService.activity.count.mockResolvedValue(0);

      await service.getAll(payloadWithStatus);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ActivityStatus.WORK_IN_PROGRESS,
          }),
        }),
      );
    });

    it('should handle filtering by phaseId', async () => {
      const payloadWithPhase = {
        ...mockPayload,
        phase: 'phase-uuid',
      };

      mockPrismaService.activity.findMany.mockResolvedValue([]);
      mockPrismaService.activity.count.mockResolvedValue(0);

      await service.getAll(payloadWithPhase);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phaseId: 'phase-uuid',
          }),
        }),
      );
    });
  });

  describe('listProjectSpecific', () => {
    const mockPayload: GetActivityDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      managerId: 'manager-uuid',
    };

    it('should successfully retrieve project specific activities', async () => {
      const mockActivities = [
        {
          id: 1,
          uuid: 'activity-uuid-1',
          title: 'Activity 1',
        },
      ];

      mockPrismaService.activity.findMany.mockResolvedValue(mockActivities);
      mockPrismaService.activity.count.mockResolvedValue(1);

      const result = await service.listProjectSpecific(mockPayload);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getHavingComms', () => {
    const mockPayload: GetActivityHavingCommsDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
    };

    it('should successfully retrieve activities with communications', async () => {
      const mockActivities = [
        {
          id: 1,
          uuid: 'activity-uuid-1',
          title: 'Activity 1',
          activityCommunication: [
            {
              id: 1,
              type: 'SMS',
              sessionId: 'session-1',
            },
          ],
        },
      ];

      mockPrismaService.activity.findMany.mockResolvedValue(mockActivities);
      mockPrismaService.activity.count.mockResolvedValue(1);
      mockCommsClient.session.get.mockResolvedValue({
        data: { status: 'COMPLETED' },
      });

      const result = await service.getHavingComms(mockPayload);

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            activityCommunication: { not: [] },
          }),
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    const mockPayload = {
      uuid: 'activity-uuid',
    };

    it('should successfully remove an activity', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
      };

      mockPrismaService.activity.update.mockResolvedValue(mockActivity);

      const result = await service.remove(mockPayload);

      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        data: { isDeleted: true },
      });
      expect(result).toEqual(mockActivity);
    });
  });

  describe('updateStatus', () => {
    const mockPayload = {
      uuid: 'activity-uuid',
      status: ActivityStatus.COMPLETED,
      notes: 'Activity completed',
      activityDocuments: {
        document1: 'content1',
      },
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    it('should successfully update activity status', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
        status: ActivityStatus.COMPLETED,
        phase: { activatedAt: new Date() },
      };

      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);
      mockPrismaService.activity.update.mockResolvedValue(mockActivity);

      const result = await service.updateStatus(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
      });
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        data: expect.objectContaining({
          status: ActivityStatus.COMPLETED,
          notes: mockPayload.notes,
        }),
        include: { phase: true },
      });
      expect(result).toEqual(mockActivity);
    });

    it('should throw RpcException when activity not found', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('update', () => {
    const mockPayload: UpdateActivityDto = {
      uuid: 'activity-uuid',
      title: 'Updated Activity',
      description: 'Updated description',
    };

    it('should successfully update an activity', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Updated Activity',
        description: 'Updated description',
      };

      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);
      mockPrismaService.activity.update.mockResolvedValue(mockActivity);

      const result = await service.update(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
      });
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: mockPayload.uuid },
        data: expect.objectContaining({
          title: mockPayload.title,
          description: mockPayload.description,
        }),
      });
      expect(result).toEqual(mockActivity);
    });

    it('should throw RpcException when activity not found', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.update(mockPayload)).rejects.toThrow(RpcException);
    });
  });

  describe('getSessionLogs', () => {
    const mockPayload = {
      communicationId: 'comm-uuid',
      activityId: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully retrieve session logs', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        activityCommunication: [
          {
            communicationId: 'comm-uuid',
            groupType: 'BENEFICIARY',
            groupId: 'group-id',
            sessionId: 'session-id',
          },
        ],
      };

      const mockSessionDetails = {
        data: {
          status: 'COMPLETED',
          addresses: ['test@example.com'],
        },
      };

      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);
      mockCommsClient.session.get.mockResolvedValue(mockSessionDetails);
      mockClientProxy.send.mockReturnValue(of({ name: 'Test Group' }));

      const result = await service.getSessionLogs(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.activityId },
      });
      expect(result).toBeDefined();
    });
  });

  describe('triggerCommunication', () => {
    const mockPayload = {
      communicationId: 'comm-uuid',
      activityId: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully trigger communication', async () => {
      const mockActivity = {
        id: 1,
        uuid: 'activity-uuid',
        activityCommunication: [
          {
            communicationId: 'comm-uuid',
            groupType: 'BENEFICIARY',
            groupId: 'group-id',
            transportId: 'transport-id',
            message: 'Test message',
            subject: 'Test subject',
          },
        ],
      };

      const mockTransportDetails = {
        data: {
          name: 'SMS',
          type: 'SMS',
          validationAddress: 'PHONE',
        },
      };

      const mockSessionData = {
        data: {
          cuid: 'session-cuid',
        },
      };

      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);
      mockCommsClient.transport.get.mockResolvedValue(mockTransportDetails);
      mockClientProxy.send.mockReturnValue(of({ name: 'Test Group' }));
      mockCommsClient.broadcast.create.mockResolvedValue(mockSessionData);
      mockPrismaService.activity.update.mockResolvedValue(mockActivity);

      const result = await service.triggerCommunication(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.activityId },
      });
      expect(result).toEqual(mockSessionData.data);
    });

    it('should throw RpcException when activity not found', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.triggerCommunication(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getCommsStats', () => {
    const mockAppId = 'app-id';

    it('should successfully retrieve communication statistics', async () => {
      const mockStats = {
        data: {
          total: 10,
          successful: 8,
          failed: 2,
        },
      };

      const mockActivities = [
        {
          uuid: 'activity-1',
          activityCommunication: [{ sessionId: 'session-1' }],
          title: 'Activity 1',
        },
      ];

      mockCommsClient.broadcast.getReport.mockResolvedValue(mockStats);
      mockPrismaService.activity.findMany.mockResolvedValue(mockActivities);

      const result = await service.getCommsStats(mockAppId);

      expect(mockCommsClient.broadcast.getReport).toHaveBeenCalledWith({
        xref: mockAppId,
      });
      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          activityCommunication: { not: { equals: [] } },
        },
        select: {
          uuid: true,
          activityCommunication: true,
          title: true,
        },
      });
      expect(result).toEqual({
        stats: mockStats.data,
        totalCommsProject: 1,
      });
    });
  });

  describe('getTransportSessionStatsByGroup', () => {
    it('should successfully retrieve transport session statistics by group', async () => {
      const mockActivities = [
        {
          activityCommunication: [
            {
              sessionId: 'session-1',
              groupType: 'BENEFICIARY',
              transportId: 'transport-1',
            },
          ],
        },
      ];

      const mockTransportResponse = {
        data: { name: 'SMS' },
      };

      const mockBroadcastResponse = {
        data: { total: 5, successful: 4 },
      };

      mockPrismaService.activity.findMany.mockResolvedValue(mockActivities);
      mockCommsClient.transport.get.mockResolvedValue(mockTransportResponse);
      mockCommsClient.session.broadcastCount.mockResolvedValue(
        mockBroadcastResponse,
      );

      const result = await service.getTransportSessionStatsByGroup('app-id');

      expect(mockPrismaService.activity.findMany).toHaveBeenCalledWith({
        select: { activityCommunication: true },
        where: { app: 'app-id' },
      });
      expect(mockCommsClient.transport.get).toHaveBeenCalledWith('transport-1');
      expect(mockCommsClient.session.broadcastCount).toHaveBeenCalledWith({
        sessions: ['session-1'],
      });
      expect(result).toBeDefined();
    });
  });
});
