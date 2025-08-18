import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy } from '@nestjs/microservices';
import { ActivityStatus } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { MS_TRIGGER_CLIENTS } from 'src/constant';
import {
  CreateActivityDto,
  GetActivityDto,
  GetActivityHavingCommsDto,
  UpdateActivityDto,
} from './dto';

describe('ActivityController', () => {
  let controller: ActivityController;
  let mockActivityService: jest.Mocked<ActivityService>;
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
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

    controller = module.get<ActivityController>(ActivityController);
    mockActivityService = module.get(ActivityService);
    mockPrismaService = module.get(PrismaService);
    mockEventEmitter = module.get(EventEmitter2);
    mockClientProxy = module.get(MS_TRIGGER_CLIENTS.RAHAT);
    mockCommsClient = module.get('COMMS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
        name: 'Test Manager',
        email: 'test@example.com',
        phone: '1234567890',
      },
    };

    it('should successfully add an activity', async () => {
      const mockResult: any = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
      };

      jest.spyOn(mockActivityService, 'add').mockResolvedValue(mockResult);

      const result = await controller.add(mockCreateActivityDto);

      expect(mockActivityService.add).toHaveBeenCalledWith(
        mockCreateActivityDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'add').mockRejectedValue(error);

      await expect(controller.add(mockCreateActivityDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getAll', () => {
    const mockGetActivityDto: GetActivityDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      managerId: 'manager-uuid',
    };

    it('should successfully get all activities', async () => {
      const mockResult: any = {
        data: [
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
        ],
        meta: {
          total: 2,
          page: 1,
          perPage: 10,
        },
      };

      jest.spyOn(mockActivityService, 'getAll').mockResolvedValue(mockResult);

      const result = await controller.getAll(mockGetActivityDto);

      expect(mockActivityService.getAll).toHaveBeenCalledWith(
        mockGetActivityDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'getAll').mockRejectedValue(error);

      await expect(controller.getAll(mockGetActivityDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('listProjectSpecific', () => {
    const mockGetActivityDto: GetActivityDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
      managerId: 'manager-uuid',
    };

    it('should successfully list project specific activities', async () => {
      const mockResult: any = {
        data: [
          {
            id: 1,
            uuid: 'activity-uuid-1',
            title: 'Activity 1',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          perPage: 10,
        },
      };

      jest
        .spyOn(mockActivityService, 'listProjectSpecific')
        .mockResolvedValue(mockResult);

      const result = await controller.listProjectSpecific(mockGetActivityDto);

      expect(mockActivityService.listProjectSpecific).toHaveBeenCalledWith(
        mockGetActivityDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest
        .spyOn(mockActivityService, 'listProjectSpecific')
        .mockRejectedValue(error);

      await expect(
        controller.listProjectSpecific(mockGetActivityDto),
      ).rejects.toThrow(error);
    });
  });

  describe('getHavingComms', () => {
    const mockGetActivityHavingCommsDto: GetActivityHavingCommsDto = {
      appId: 'app-id',
      page: 1,
      perPage: 10,
    };

    it('should successfully get activities with communications', async () => {
      const mockResult: any = {
        data: [
          {
            id: 1,
            uuid: 'activity-uuid-1',
            title: 'Activity 1',
            activityCommunication: [
              {
                id: 1,
                type: 'SMS',
              },
            ],
          },
        ],
        meta: {
          total: 1,
          page: 1,
          perPage: 10,
        },
      };

      jest
        .spyOn(mockActivityService, 'getHavingComms')
        .mockResolvedValue(mockResult);

      const result = await controller.getHavingComms(
        mockGetActivityHavingCommsDto,
      );

      expect(mockActivityService.getHavingComms).toHaveBeenCalledWith(
        mockGetActivityHavingCommsDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest
        .spyOn(mockActivityService, 'getHavingComms')
        .mockRejectedValue(error);

      await expect(
        controller.getHavingComms(mockGetActivityHavingCommsDto),
      ).rejects.toThrow(error);
    });
  });

  describe('getOne', () => {
    const mockPayload = {
      uuid: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully get one activity', async () => {
      const mockResult: any = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
        activityCommunication: [],
        activityPayout: [],
        activityDocument: [],
      };

      jest.spyOn(mockActivityService, 'getOne').mockResolvedValue(mockResult);

      const result = await controller.getOne(mockPayload);

      expect(mockActivityService.getOne).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'getOne').mockRejectedValue(error);

      await expect(controller.getOne(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    const mockPayload = {
      uuid: 'activity-uuid',
    };

    it('should successfully remove an activity', async () => {
      const mockResult: any = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
        isDeleted: true,
      };

      jest.spyOn(mockActivityService, 'remove').mockResolvedValue(mockResult);

      const result = await controller.remove(mockPayload);

      expect(mockActivityService.remove).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'remove').mockRejectedValue(error);

      await expect(controller.remove(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('triggerCommunication', () => {
    const mockPayload = {
      communicationId: 'comm-uuid',
      activityId: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully trigger communication', async () => {
      const mockResult: any = {
        success: true,
        message: 'Communication triggered',
      };

      jest
        .spyOn(mockActivityService, 'triggerCommunication')
        .mockResolvedValue(mockResult);

      const result = await controller.triggerCommunication(mockPayload);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest
        .spyOn(mockActivityService, 'triggerCommunication')
        .mockRejectedValue(error);

      await expect(
        controller.triggerCommunication(mockPayload),
      ).rejects.toThrow(error);
    });
  });

  describe('communicationLogs', () => {
    const mockPayload = {
      communicationId: 'comm-uuid',
      activityId: 'activity-uuid',
      appId: 'app-id',
    };

    it('should successfully get communication logs', async () => {
      const mockResult: any = [
        {
          id: 1,
          message: 'Test log',
          timestamp: new Date(),
        },
      ];

      jest
        .spyOn(mockActivityService, 'getSessionLogs')
        .mockResolvedValue(mockResult);

      const result = await controller.communicationLogs(mockPayload);

      expect(mockActivityService.getSessionLogs).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest
        .spyOn(mockActivityService, 'getSessionLogs')
        .mockRejectedValue(error);

      await expect(controller.communicationLogs(mockPayload)).rejects.toThrow(
        error,
      );
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
      const mockResult: any = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Test Activity',
        status: ActivityStatus.COMPLETED,
      };

      jest
        .spyOn(mockActivityService, 'updateStatus')
        .mockResolvedValue(mockResult);

      const result = await controller.updateStatus(mockPayload);

      expect(mockActivityService.updateStatus).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'updateStatus').mockRejectedValue(error);

      await expect(controller.updateStatus(mockPayload)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const mockUpdateActivityDto: UpdateActivityDto = {
      uuid: 'activity-uuid',
      title: 'Updated Activity',
      description: 'Updated description',
    };

    it('should successfully update an activity', async () => {
      const mockResult: any = {
        id: 1,
        uuid: 'activity-uuid',
        title: 'Updated Activity',
        description: 'Updated description',
      };

      jest.spyOn(mockActivityService, 'update').mockResolvedValue(mockResult);

      const result = await controller.update(mockUpdateActivityDto);

      expect(mockActivityService.update).toHaveBeenCalledWith(
        mockUpdateActivityDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'update').mockRejectedValue(error);

      await expect(controller.update(mockUpdateActivityDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getCommsStats', () => {
    const mockPayload = {
      appId: 'app-id',
    };

    it('should successfully get communication statistics', async () => {
      const mockResult: any = {
        total: 10,
        successful: 8,
        failed: 2,
      };

      jest
        .spyOn(mockActivityService, 'getCommsStats')
        .mockResolvedValue(mockResult);

      const result = await controller.getCommsStats(mockPayload);

      expect(mockActivityService.getCommsStats).toHaveBeenCalledWith(
        mockPayload.appId,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'getCommsStats').mockRejectedValue(error);

      await expect(controller.getCommsStats(mockPayload)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getTransportSessionStatsByGroup', () => {
    it('should successfully get transport session statistics by group', async () => {
      const mockResult: any = [
        {
          groupType: 'BENEFICIARY',
          totalSessions: 5,
          successfulSessions: 4,
        },
      ];

      jest
        .spyOn(mockActivityService, 'getTransportSessionStatsByGroup')
        .mockResolvedValue(mockResult);

      const result = await controller.getTransportSessionStatsByGroup({
        appId: 'app-id',
      });

      expect(
        mockActivityService.getTransportSessionStatsByGroup,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      jest
        .spyOn(mockActivityService, 'getTransportSessionStatsByGroup')
        .mockRejectedValue(error);

      await expect(
        controller.getTransportSessionStatsByGroup({ appId: 'app-id' }),
      ).rejects.toThrow(error);
    });
  });

  describe('getComms', () => {
    const mockGetCommsPayload: GetActivityHavingCommsDto = {
      page: 1,
      perPage: 10,
      appId: 'test-app-id',
      filters: {
        transportName: 'SMS',
        title: 'Test Activity',
        groupId: 'group-1',
        groupType: 'BENEFICIARY',
        groupName: 'Test Group',
        sessionStatus: 'COMPLETED',
      },
    };

    it('should successfully get communications data', async () => {
      const mockResult = {
        data: [
          {
            communication_title: 'Test Communication',
            transportName: 'SMS',
            sessionStatus: 'COMPLETED',
            groupName: 'Test Group',
            message: 'Test message',
            subject: 'Test subject',
            group_id: 'group-1',
            group_type: 'BENEFICIARY',
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

      jest.spyOn(mockActivityService, 'getComms').mockResolvedValue(mockResult);

      const result = await controller.getComms(mockGetCommsPayload);

      expect(mockActivityService.getComms).toHaveBeenCalledWith(
        mockGetCommsPayload,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle getComms service errors', async () => {
      const error = new Error('Service error');
      jest.spyOn(mockActivityService, 'getComms').mockRejectedValue(error);

      await expect(controller.getComms(mockGetCommsPayload)).rejects.toThrow(
        error,
      );
    });

    it('should handle missing transport name in filters', async () => {
      const payloadWithoutTransport = {
        ...mockGetCommsPayload,
        filters: { ...mockGetCommsPayload.filters, transportName: undefined },
      };

      const error = new Error('Transport name not found');
      jest.spyOn(mockActivityService, 'getComms').mockRejectedValue(error);

      await expect(
        controller.getComms(payloadWithoutTransport),
      ).rejects.toThrow(error);
    });
  });
});
