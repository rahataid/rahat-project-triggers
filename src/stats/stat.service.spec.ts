import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@rumsan/prisma';
import { ActivityService } from 'src/activity/activity.service';
import { ActivityStatus } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { StatsService } from './stat.service';
import { StatDto } from './dto/stat.dto';

import { Logger } from '@nestjs/common';

describe('StatsService', () => {
  let service: StatsService;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    verbose: jest.Mock;
  };

  const mockPrismaService = {
    phase: {
      findMany: jest.fn(),
    },
    activity: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    stats: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockActivityService = {
    getTransportSessionStatsByGroup: jest.fn(),
  };

  beforeEach(async () => {
    // Create mock logger before instantiating the service
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    // Mock the Logger constructor
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
    jest
      .spyOn(Logger.prototype, 'verbose')
      .mockImplementation(mockLogger.verbose);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePhaseActivities', () => {
    const mockPhases = [
      { uuid: 'phase-1', name: 'Phase 1' },
      { uuid: 'phase-2', name: 'Phase 2' },
    ];

    const mockAppGroups = [
      { app: 'app-1', _count: { _all: 10 } },
      { app: 'app-2', _count: { _all: 5 } },
    ];

    beforeEach(() => {
      mockPrismaService.phase.findMany.mockResolvedValue(mockPhases);
      mockPrismaService.activity.groupBy.mockResolvedValue(mockAppGroups);
      mockPrismaService.activity.count.mockResolvedValue(5);
      mockPrismaService.stats.upsert.mockResolvedValue({});
    });

    it('should calculate phase activities successfully', async () => {
      await service.calculatePhaseActivities();

      expect(mockPrismaService.phase.findMany).toHaveBeenCalled();
      expect(mockPrismaService.activity.groupBy).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.activity.count).toHaveBeenCalledTimes(4);
      expect(mockPrismaService.stats.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle empty phases', async () => {
      mockPrismaService.phase.findMany.mockResolvedValue([]);

      await service.calculatePhaseActivities();

      expect(mockPrismaService.phase.findMany).toHaveBeenCalled();
      expect(mockPrismaService.activity.groupBy).not.toHaveBeenCalled();
      expect(mockPrismaService.stats.upsert).not.toHaveBeenCalled();
    });

    it('should handle empty app groups', async () => {
      mockPrismaService.activity.groupBy.mockResolvedValue([]);

      await service.calculatePhaseActivities();

      expect(mockPrismaService.activity.groupBy).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.activity.count).not.toHaveBeenCalled();
      expect(mockPrismaService.stats.upsert).not.toHaveBeenCalled();
    });

    it('should calculate completed percentage correctly', async () => {
      mockPrismaService.activity.count.mockResolvedValue(0);

      await service.calculatePhaseActivities();

      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'ACTIVITIES_APP-1' },
          update: expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                completedPercentage: '0.00',
              }),
            ]),
          }),
          create: expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                completedPercentage: '0.00',
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('calculateActivitiesWithCommunication', () => {
    const mockCommunicationActivity = [
      { app: 'app-1', _count: { _all: 10 } },
      { app: 'app-2', _count: { _all: 5 } },
    ];

    beforeEach(() => {
      mockPrismaService.activity.groupBy.mockResolvedValue(
        mockCommunicationActivity,
      );
      mockPrismaService.stats.upsert.mockResolvedValue({});
    });

    it('should calculate activities with communication successfully', async () => {
      await service.calculateActivitiesWithCommunication();

      expect(mockPrismaService.activity.groupBy).toHaveBeenCalledWith({
        by: ['app'],
        where: {
          isDeleted: false,
          activityCommunication: {
            not: [],
          },
        },
        _count: {
          _all: true,
        },
      });

      expect(mockPrismaService.stats.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'ACTIVITIES_WITH_COMM_APP-1' },
          update: expect.objectContaining({
            data: { count: 10 },
          }),
          create: expect.objectContaining({
            data: { count: 10 },
          }),
        }),
      );
    });

    it('should handle empty communication activities', async () => {
      mockPrismaService.activity.groupBy.mockResolvedValue([]);

      await service.calculateActivitiesWithCommunication();

      expect(mockPrismaService.stats.upsert).not.toHaveBeenCalled();
    });
  });

  describe('calculateActivitiesAutomated', () => {
    const mockAutomatedActivity = [
      { app: 'app-1', _count: { _all: 8 } },
      { app: 'app-2', _count: { _all: 3 } },
    ];

    beforeEach(() => {
      mockPrismaService.activity.groupBy.mockResolvedValue(
        mockAutomatedActivity,
      );
      mockPrismaService.stats.upsert.mockResolvedValue({});
    });

    it('should calculate automated activities successfully', async () => {
      await service.calculateActivitiesAutomated();

      expect(mockPrismaService.activity.groupBy).toHaveBeenCalledWith({
        by: ['app'],
        where: {
          isDeleted: false,
          isAutomated: true,
        },
        _count: {
          _all: true,
        },
      });

      expect(mockPrismaService.stats.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'ACTIVITIES_AUTOMATED_APP-1' },
          update: expect.objectContaining({
            data: { count: 8 },
          }),
          create: expect.objectContaining({
            data: { count: 8 },
          }),
        }),
      );
    });

    it('should handle empty automated activities', async () => {
      mockPrismaService.activity.groupBy.mockResolvedValue([]);

      await service.calculateActivitiesAutomated();

      expect(mockPrismaService.stats.upsert).not.toHaveBeenCalled();
    });
  });

  describe('calculateCommsStatsForAllApps', () => {
    const mockGroupedActivities = [{ app: 'app-1' }, { app: 'app-2' }];

    const mockTransportStats = {
      totalSessions: 100,
      successfulSessions: 80,
    };

    beforeEach(() => {
      mockPrismaService.activity.groupBy.mockResolvedValue(
        mockGroupedActivities,
      );
      mockActivityService.getTransportSessionStatsByGroup.mockResolvedValue(
        mockTransportStats,
      );
      mockPrismaService.stats.upsert.mockResolvedValue({});
    });

    it('should calculate communication stats successfully', async () => {
      await service.calculateCommsStatsForAllApps();

      expect(mockPrismaService.activity.groupBy).toHaveBeenCalledWith({
        by: ['app'],
        where: {
          isDeleted: false,
          activityCommunication: { not: { equals: [] } },
        },
        _count: {
          _all: true,
        },
      });

      expect(
        mockActivityService.getTransportSessionStatsByGroup,
      ).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.stats.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'COMMS_STATS_APP-1' },
          update: expect.objectContaining({
            data: mockTransportStats,
          }),
          create: expect.objectContaining({
            data: mockTransportStats,
          }),
        }),
      );
    });

    it('should handle empty grouped activities', async () => {
      mockPrismaService.activity.groupBy.mockResolvedValue([]);

      await service.calculateCommsStatsForAllApps();

      expect(
        mockActivityService.getTransportSessionStatsByGroup,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.stats.upsert).not.toHaveBeenCalled();
    });

    it('should handle standard Error object', async () => {
      const error = new Error('Database error');
      mockPrismaService.activity.groupBy.mockRejectedValue(error);

      const result = await service.calculateCommsStatsForAllApps();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while calculating communication stats',
        error,
      );
      expect(result).toBeUndefined();
    });

    it('should handle error from transport session stats', async () => {
      const mockActivities = [{ app: 'test-app' }];
      const error = new Error('Transport session error');
      mockPrismaService.activity.groupBy.mockResolvedValue(mockActivities);
      mockActivityService.getTransportSessionStatsByGroup.mockRejectedValue(
        error,
      );

      const result = await service.calculateCommsStatsForAllApps();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while calculating communication stats',
        error,
      );
      expect(result).toBeUndefined();
    });

    it('should handle error during stats save', async () => {
      const mockActivities = [{ app: 'test-app' }];
      const mockStats = { totalSessions: 10 };
      const error = new Error('Save error');

      mockPrismaService.activity.groupBy.mockResolvedValue(mockActivities);
      mockActivityService.getTransportSessionStatsByGroup.mockResolvedValue(
        mockStats,
      );
      mockPrismaService.stats.upsert.mockRejectedValue(error);

      const result = await service.calculateCommsStatsForAllApps();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while calculating communication stats',
        error,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('save', () => {
    const mockStatDto: StatDto = {
      name: 'test_stat',
      data: { count: 10 },
      group: 'test_group',
    };

    const mockSavedStat = {
      id: 1,
      name: 'TEST_STAT',
      data: { count: 10 },
      group: 'test_group',
    };

    beforeEach(() => {
      mockPrismaService.stats.upsert.mockResolvedValue(mockSavedStat);
    });

    it('should save stat successfully', async () => {
      const result = await service.save(mockStatDto);

      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith({
        where: { name: 'TEST_STAT' },
        update: {
          name: 'TEST_STAT',
          data: { count: 10 },
          group: 'test_group',
        },
        create: {
          name: 'TEST_STAT',
          data: { count: 10 },
          group: 'test_group',
        },
      });

      expect(result).toEqual(mockSavedStat);
    });

    it('should convert name to uppercase', async () => {
      await service.save(mockStatDto);

      expect(mockPrismaService.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'TEST_STAT' },
          update: expect.objectContaining({
            name: 'TEST_STAT',
          }),
          create: expect.objectContaining({
            name: 'TEST_STAT',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockStats = [
      { id: 1, name: 'STAT_1', data: { count: 10 } },
      { id: 2, name: 'STAT_2', data: { count: 20 } },
    ];

    beforeEach(() => {
      mockPrismaService.stats.findMany.mockResolvedValue(mockStats);
    });

    it('should return all stats', async () => {
      const result = await service.findOne();

      expect(mockPrismaService.stats.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('findAll', () => {
    const mockStats = [
      { id: 1, name: 'APP_1_STAT', data: { count: 10 } },
      { id: 2, name: 'APP_1_OTHER_STAT', data: { count: 20 } },
    ];

    beforeEach(() => {
      mockPrismaService.stats.findMany.mockResolvedValue(mockStats);
    });

    it('should find stats by appId successfully', async () => {
      const payload = { appId: 'app_1' };
      const result = await service.findAll(payload);

      expect(mockPrismaService.stats.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'APP_1',
            mode: 'insensitive',
          },
        },
      });

      expect(result).toEqual(mockStats);
    });

    it('should convert appId to uppercase', async () => {
      const payload = { appId: 'app_1' };
      await service.findAll(payload);

      expect(mockPrismaService.stats.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'APP_1',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaService.stats.findMany.mockResolvedValue([]);
      const payload = { appId: 'nonexistent' };
      const result = await service.findAll(payload);

      expect(result).toEqual([]);
    });
  });
});
