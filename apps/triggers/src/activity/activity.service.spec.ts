import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ActivityStatus } from '@lib/database';
import { PrismaService } from '@lib/database';
import { of, throwError } from 'rxjs';
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
    $queryRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
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
      list: jest.fn(),
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

    const mockActivity = {
      id: 1,
      uuid: 'activity-uuid',
      activityCommunication: [
        {
          communicationId: 'comm-uuid',
          groupType: 'BENEFICIARY',
          groupId: 'group-id',
          sessionId: 'session-id',
          transportId: 'transport-id',
          message: 'Test message',
        },
      ],
    };

    const mockGroup = { uuid: 'group-id', name: 'Test Group' };

    beforeEach(() => {
      mockPrismaService.activity.findUnique.mockResolvedValue(mockActivity);
      mockClientProxy.send.mockReturnValue(of(mockGroup));
    });

    it('should return sessionDetails without addresses, communicationDetail, and group on success', async () => {
      const mockSessionDetails = {
        data: {
          status: 'COMPLETED',
          updatedAt: new Date('2024-01-01'),
          addresses: ['09000000000', '09111111111'],
          someOtherField: 'value',
        },
      };

      mockCommsClient.session.get.mockResolvedValue(mockSessionDetails);

      const result = await service.getSessionLogs(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.activityId },
      });
      expect(mockCommsClient.session.get).toHaveBeenCalledWith('session-id');
      expect(result).toEqual({
        sessionDetails: {
          status: 'COMPLETED',
          updatedAt: mockSessionDetails.data.updatedAt,
          someOtherField: 'value',
        },
        communicationDetail: expect.objectContaining({
          communicationId: 'comm-uuid',
          groupType: 'BENEFICIARY',
          groupId: 'group-id',
          sessionId: 'session-id',
        }),
        group: mockGroup,
      });
    });

    it('should not include addresses in sessionDetails', async () => {
      mockCommsClient.session.get.mockResolvedValue({
        data: {
          status: 'COMPLETED',
          addresses: ['09000000000'],
          someField: 'value',
        },
      });

      const result = await service.getSessionLogs(mockPayload);

      expect(result.sessionDetails).not.toHaveProperty('addresses');
      expect(result.sessionDetails).toHaveProperty('status', 'COMPLETED');
      expect(result.sessionDetails).toHaveProperty('someField', 'value');
    });

    it('should return sessionDetails: null when session data is null', async () => {
      mockCommsClient.session.get.mockResolvedValue({ data: null });

      const result = await service.getSessionLogs(mockPayload);

      expect(result).toEqual({
        sessionDetails: null,
        communicationDetail: expect.objectContaining({
          communicationId: 'comm-uuid',
        }),
        group: mockGroup,
      });
    });

    it('should return sessionDetails: null when session data is undefined', async () => {
      mockCommsClient.session.get.mockResolvedValue({ data: undefined });

      const result = await service.getSessionLogs(mockPayload);

      expect(result.sessionDetails).toBeNull();
      expect(result.group).toEqual(mockGroup);
    });

    it('should throw RpcException when activity is not found', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(service.getSessionLogs(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when communicationId does not match any communication', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue({
        ...mockActivity,
        activityCommunication: [
          {
            communicationId: 'different-comm-uuid',
            groupType: 'BENEFICIARY',
            groupId: 'group-id',
            sessionId: 'session-id',
          },
        ],
      });

      await expect(service.getSessionLogs(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when session fetch fails', async () => {
      mockCommsClient.session.get.mockRejectedValue(
        new Error('Session service unavailable'),
      );

      await expect(service.getSessionLogs(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when group details fetch fails', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Group service down')),
      );

      await expect(service.getSessionLogs(mockPayload)).rejects.toThrow(
        RpcException,
      );
    });

    it('should pass appId to getGroupDetails via getGroupDetails call', async () => {
      mockCommsClient.session.get.mockResolvedValue({
        data: { status: 'COMPLETED', addresses: [] },
      });

      await service.getSessionLogs(mockPayload);

      expect(mockClientProxy.send).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: mockPayload.appId }),
        expect.objectContaining({ uuid: 'group-id' }),
      );
    });

    it('should call getActivityCommunicationDetails with correct communicationId and activityId', async () => {
      mockCommsClient.session.get.mockResolvedValue({
        data: { status: 'NEW', addresses: [] },
      });

      await service.getSessionLogs(mockPayload);

      expect(mockPrismaService.activity.findUnique).toHaveBeenCalledWith({
        where: { uuid: mockPayload.activityId },
      });
    });
  });

  describe('getComms', () => {
    const mockPayload: GetActivityHavingCommsDto = {
      page: 1,
      perPage: 10,
      appId: 'test-app-id',
      filters: {
        transportName: 'SMS',
        title: 'Test Communication',
        groupId: 'group-1',
        groupType: 'BENEFICIARY',
        groupName: 'Test Group',
        sessionStatus: 'COMPLETED',
      },
    };

    const mockRawQueryResult = [
      {
        activity_title: 'Test Activity',
        communication_title: 'Test Communication',
        app: 'test-app-id',
        message: 'Test message',
        subject: 'Test subject',
        sessionId: 'session-1',
        transportId: 'transport-1',
        communicationId: 'comm-1',
        group_id: 'group-1',
        group_type: 'BENEFICIARY',
        file_name: null,
        media_url: null,
        timestamp: new Date(),
      },
    ];

    const mockSessionData = {
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    };

    const mockBeneficiaryGroup = {
      uuid: 'group-1',
      name: 'Test Group',
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock database query
      mockPrismaServiceImplementation.$queryRawUnsafe = jest
        .fn()
        .mockResolvedValue(mockRawQueryResult);

      // Mock transport list
      mockCommsClientImplementation.transport = {
        get: jest.fn(),
        list: jest.fn().mockResolvedValue({
          data: [
            {
              cuid: 'transport-1',
              name: 'SMS',
            },
          ],
        }),
      };

      // Mock session.get
      mockCommsClientImplementation.session = {
        get: jest.fn().mockResolvedValue(mockSessionData),
        broadcastCount: jest.fn(),
      };

      // Mock group fetching
      mockClientProxyImplementation.send = jest
        .fn()
        .mockReturnValue(of([mockBeneficiaryGroup]));
    });

    it('should successfully fetch and process communications data with merged title', async () => {
      const result = await service.getComms(mockPayload);

      // ✅ Updated: No title in SQL call
      expect(
        mockPrismaServiceImplementation.$queryRawUnsafe,
      ).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(String), // appId
        expect.any(String), // groupId
        expect.any(String), // groupType
      );

      // ✅ Check mergeTitleAndFilter effect: `title` should equal communication_title (fallback logic works)
      expect(result.data[0].title).toBe('Test Communication');

      // ✅ Ensure filtering by title works (from mergeTitleAndFilter)
      expect(result.data[0].title.toLowerCase()).toContain(
        mockPayload.filters.title.toLowerCase(),
      );

      // Transport enrichment
      expect(mockCommsClientImplementation.transport.list).toHaveBeenCalled();

      // Session enrichment
      expect(mockCommsClientImplementation.session.get).toHaveBeenCalledWith(
        'session-1',
      );

      // Group data enrichment
      expect(mockClientProxyImplementation.send).toHaveBeenCalledWith(
        expect.objectContaining({ cmd: expect.any(String) }),
        expect.objectContaining({ uuids: ['group-1'] }),
      );

      // Final result structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data[0]).toMatchObject({
        transportName: 'SMS',
        sessionStatus: 'COMPLETED',
        groupName: 'Test Group',
      });
    });

    it('should throw error when transport name is not provided', async () => {
      const payloadWithoutTransport = {
        ...mockPayload,
        filters: { ...mockPayload.filters, transportName: undefined },
      };

      await expect(service.getComms(payloadWithoutTransport)).rejects.toThrow(
        new RpcException('Transport name not found '),
      );
    });

    it('should handle session fetch errors gracefully', async () => {
      const testPayload = {
        page: 1,
        perPage: 10,
        appId: 'test-app-id',
        filters: { transportName: 'SMS' },
      };

      mockPrismaServiceImplementation.$queryRawUnsafe.mockResolvedValue([
        {
          activity_title: 'Activity Title',
          communication_title: null, // will fallback to activity title
          app: 'test-app-id',
          message: 'Test message',
          subject: 'Test subject',
          sessionId: 'session-1',
          transportId: 'transport-1',
          communicationId: 'comm-1',
          group_id: 'group-1',
          group_type: 'BENEFICIARY',
          timestamp: new Date(),
        },
      ]);

      mockCommsClientImplementation.session.get.mockRejectedValue(
        new Error('Session fetch failed'),
      );

      const result = await service.getComms(testPayload);

      // ✅ Check fallback title
      expect(result.data[0].title).toBe('Activity Title');

      // ✅ Session should default to WORK IN PROGRESS
      expect(result.data[0].sessionStatus).toBe('WORK IN PROGRESS');
    });

    it('should filter results by session status', async () => {
      mockSessionData.data.status = 'IN_PROGRESS';
      mockCommsClientImplementation.session.get.mockResolvedValue(
        mockSessionData,
      );

      const result = await service.getComms({
        ...mockPayload,
        filters: { ...mockPayload.filters, sessionStatus: 'COMPLETED' },
      });

      expect(result.data).toHaveLength(0);
    });

    it('should filter results by group name', async () => {
      const result = await service.getComms({
        ...mockPayload,
        filters: { ...mockPayload.filters, groupName: 'Non-existent Group' },
      });

      expect(result.data).toHaveLength(0);
    });

    it('should handle database query errors', async () => {
      mockPrismaServiceImplementation.$queryRawUnsafe.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getComms(mockPayload)).rejects.toThrow(
        new RpcException('Database error'),
      );
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

  describe('getTransportSessionStats', () => {
    beforeEach(() => {
      // Mock transport list for buildTransportCache
      mockCommsClientImplementation.transport = {
        get: jest.fn(),
        list: jest.fn().mockResolvedValue({
          data: [
            { cuid: 'transport-sms', name: 'SMS' },
            { cuid: 'transport-email', name: 'Email' },
            { cuid: 'transport-voice', name: 'Voice' },
          ],
        }),
      };
    });

    it('should return grouped transport stats with names and totals', async () => {
      const mockRows = [
        { transportId: 'transport-sms', total: 4 },
        { transportId: 'transport-email', total: 3 },
        { transportId: 'transport-voice', total: 3 },
      ];

      mockPrismaServiceImplementation.$queryRaw.mockResolvedValue(mockRows);

      const result = await service.getTransportSessionStats();

      expect(mockCommsClientImplementation.transport.list).toHaveBeenCalled();
      expect(mockPrismaServiceImplementation.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual([
        { transportId: 'transport-sms', transportName: 'SMS', total: 4 },
        { transportId: 'transport-email', transportName: 'Email', total: 3 },
        { transportId: 'transport-voice', transportName: 'Voice', total: 3 },
      ]);
    });

    it('should return empty array when no communication data found', async () => {
      mockPrismaServiceImplementation.$queryRaw.mockResolvedValue([]);

      const result = await service.getTransportSessionStats();

      expect(result).toEqual([]);
    });

    it('should return "Unknown" for transport not in cache', async () => {
      const mockRows = [{ transportId: 'transport-unknown', total: 2 }];

      mockPrismaServiceImplementation.$queryRaw.mockResolvedValue(mockRows);

      const result = await service.getTransportSessionStats();

      expect(result).toEqual([
        {
          transportId: 'transport-unknown',
          transportName: 'Unknown',
          total: 2,
        },
      ]);
    });

    it('should return total as number type from SQL ::int cast', async () => {
      const mockRows = [{ transportId: 'transport-sms', total: 99 }];

      mockPrismaServiceImplementation.$queryRaw.mockResolvedValue(mockRows);

      const result = await service.getTransportSessionStats();

      expect(typeof result[0].total).toBe('number');
      expect(result[0].total).toBe(99);
    });

    it('should throw RpcException when query fails', async () => {
      mockPrismaServiceImplementation.$queryRaw.mockRejectedValue(
        new Error('DB query failed'),
      );

      await expect(service.getTransportSessionStats()).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when transport list fails', async () => {
      mockCommsClientImplementation.transport.list.mockRejectedValue(
        new Error('Transport API failed'),
      );

      await expect(service.getTransportSessionStats()).rejects.toThrow(
        RpcException,
      );
    });
  });
});
