import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@lib/database';
import { LibraryService } from './library.service';
import { activities } from 'src/utils/activities';

describe('LibraryService', () => {
  let service: LibraryService;
  let prismaService: any;

  const mockPrismaService = {
    activity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActivityTemplates', () => {
    it('should return merged templates with defaults when no DB templates exist', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({});

      expect(result.data.length).toBe(activities.length);
      expect(result.meta.total).toBe(activities.length);
      expect(result.meta.currentPage).toBe(1);
      result.data.forEach((item) => {
        expect(item.source).toBe('default');
        expect(item.isTemplate).toBe(true);
      });
    });

    it('should return DB templates merged with defaults', async () => {
      const dbTemplate = {
        uuid: 'db-uuid-1',
        title: 'DB Template',
        isTemplate: true,
        activityCommunication: [],
        category: { name: 'Test', uuid: 'cat-1' },
        phase: { name: 'Readiness', uuid: 'phase-1' },
        manager: null,
      };

      prismaService.activity.findMany.mockResolvedValue([dbTemplate]);

      const result = await service.getActivityTemplates({});

      expect(result.data.length).toBe(activities.length + 1);
      expect(result.data[0]).toEqual(dbTemplate);
    });

    it('should deduplicate when DB template has same uuid as default', async () => {
      const defaultUuid = activities[0].uuid;
      const dbTemplate = {
        uuid: defaultUuid,
        title: 'Overridden from DB',
        isTemplate: true,
        activityCommunication: [],
        category: { name: 'Test', uuid: 'cat-1' },
        phase: { name: 'Readiness', uuid: 'phase-1' },
        manager: null,
      };

      prismaService.activity.findMany.mockResolvedValue([dbTemplate]);

      const result = await service.getActivityTemplates({});

      // DB version replaces default, so total = defaults - 1 duplicate + 1 db = defaults count
      expect(result.meta.total).toBe(activities.length);
      const found = result.data.find((d) => d.uuid === defaultUuid);
      expect(found.title).toBe('Overridden from DB');
    });

    it('should filter by phase', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        phase: 'Preparedness',
      });

      result.data.forEach((item) => {
        expect(item.phase.name.toUpperCase()).toBe('PREPAREDNESS');
      });
    });

    it('should filter by category', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        category: 'Early Warning',
      });

      result.data.forEach((item) => {
        expect(item.category.name.toLowerCase()).toContain('early warning');
      });
    });

    it('should filter by title', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        title: 'beneficiary',
      });

      result.data.forEach((item) => {
        expect(item.title.toLowerCase()).toContain('beneficiary');
      });
    });

    it('should filter by isAutomated=true', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        isAutomated: 'true',
      });

      result.data.forEach((item) => {
        expect(item.isAutomated).toBe(true);
      });
    });

    it('should filter by isAutomated=false', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        isAutomated: 'false',
      });

      result.data.forEach((item) => {
        expect(item.isAutomated).toBe(false);
      });
    });

    it('should filter by hasCommunication=true on DB results', async () => {
      const withComms = {
        uuid: 'with-comms',
        title: 'Has Comms',
        isTemplate: true,
        activityCommunication: [{ type: 'sms' }],
        category: { name: 'Test', uuid: 'c1' },
        phase: { name: 'Readiness', uuid: 'p1' },
        manager: null,
      };
      const withoutComms = {
        uuid: 'without-comms',
        title: 'No Comms',
        isTemplate: true,
        activityCommunication: [],
        category: { name: 'Test', uuid: 'c2' },
        phase: { name: 'Readiness', uuid: 'p2' },
        manager: null,
      };

      prismaService.activity.findMany.mockResolvedValue([
        withComms,
        withoutComms,
      ]);

      const result = await service.getActivityTemplates({
        hasCommunication: true,
      });

      const dbItems = result.data.filter((d) => d.uuid === 'with-comms');
      expect(dbItems.length).toBe(1);
      const noCommsDbItem = result.data.find((d) => d.uuid === 'without-comms');
      expect(noCommsDbItem).toBeUndefined();
    });

    it('should filter by hasCommunication=false on DB results', async () => {
      const withComms = {
        uuid: 'with-comms',
        title: 'Has Comms',
        isTemplate: true,
        activityCommunication: [{ type: 'sms' }],
        category: { name: 'Test', uuid: 'c1' },
        phase: { name: 'Readiness', uuid: 'p1' },
        manager: null,
      };
      const withoutComms = {
        uuid: 'without-comms',
        title: 'No Comms',
        isTemplate: true,
        activityCommunication: [],
        category: { name: 'Test', uuid: 'c2' },
        phase: { name: 'Readiness', uuid: 'p2' },
        manager: null,
      };

      prismaService.activity.findMany.mockResolvedValue([
        withComms,
        withoutComms,
      ]);

      const result = await service.getActivityTemplates({
        hasCommunication: false,
      });

      const dbItems = result.data.filter((d) => d.uuid === 'without-comms');
      expect(dbItems.length).toBe(1);
      const withCommsDbItem = result.data.find((d) => d.uuid === 'with-comms');
      expect(withCommsDbItem).toBeUndefined();
    });

    it('should handle hasCommunication=false with null/non-array activityCommunication', async () => {
      const nullComms = {
        uuid: 'null-comms',
        title: 'Null Comms',
        isTemplate: true,
        activityCommunication: null,
        category: { name: 'Test', uuid: 'c1' },
        phase: { name: 'Readiness', uuid: 'p1' },
        manager: null,
      };

      prismaService.activity.findMany.mockResolvedValue([nullComms]);

      const result = await service.getActivityTemplates({
        hasCommunication: false,
      });

      const found = result.data.find((d) => d.uuid === 'null-comms');
      expect(found).toBeDefined();
    });

    it('should paginate results', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        page: 1,
        perPage: 2,
      });

      expect(result.data.length).toBe(2);
      expect(result.meta.perPage).toBe(2);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.next).toBe(2);
      expect(result.meta.prev).toBeNull();
    });

    it('should handle second page pagination', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        page: 2,
        perPage: 2,
      });

      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.prev).toBe(1);
    });

    it('should set next to null on last page', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      const result = await service.getActivityTemplates({
        page: 1,
        perPage: 100,
      });

      expect(result.meta.next).toBeNull();
    });

    it('should pass appId to DB query', async () => {
      prismaService.activity.findMany.mockResolvedValue([]);

      await service.getActivityTemplates({ appId: 'app-123' });

      const callArgs = prismaService.activity.findMany.mock.calls[0][0];
      expect(callArgs.where.app).toBe('app-123');
    });

    it('should throw RpcException on error', async () => {
      prismaService.activity.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getActivityTemplates({})).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException with fallback message when error has no message', async () => {
      prismaService.activity.findMany.mockRejectedValue({});

      await expect(service.getActivityTemplates({})).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getActivityTemplateById', () => {
    it('should return a default template by uuid', async () => {
      const defaultUuid = activities[0].uuid;

      const result = await service.getActivityTemplateById({
        uuid: defaultUuid,
      });

      expect(result.uuid).toBe(defaultUuid);
      expect(result.source).toBe('default');
      expect(result.isTemplate).toBe(true);
    });

    it('should return a DB template when not in defaults', async () => {
      const dbTemplate = {
        uuid: 'db-only-uuid',
        title: 'DB Only Template',
        isTemplate: true,
        category: { name: 'Test', uuid: 'c1' },
        phase: { name: 'Readiness', uuid: 'p1', source: {} },
        manager: null,
      };

      prismaService.activity.findFirst.mockResolvedValue(dbTemplate);

      const result = await service.getActivityTemplateById({
        uuid: 'db-only-uuid',
      });

      expect(result).toEqual(dbTemplate);
      expect(prismaService.activity.findFirst).toHaveBeenCalledWith({
        where: {
          uuid: 'db-only-uuid',
          isTemplate: true,
          isDeleted: false,
        },
        include: {
          category: true,
          phase: { include: { source: true } },
          manager: true,
        },
      });
    });

    it('should include appId in DB query when provided', async () => {
      const dbTemplate = {
        uuid: 'db-uuid',
        title: 'DB Template',
        isTemplate: true,
      };

      prismaService.activity.findFirst.mockResolvedValue(dbTemplate);

      await service.getActivityTemplateById({
        uuid: 'db-uuid',
        appId: 'app-123',
      });

      const callArgs = prismaService.activity.findFirst.mock.calls[0][0];
      expect(callArgs.where.app).toBe('app-123');
    });

    it('should throw RpcException when template not found in DB', async () => {
      prismaService.activity.findFirst.mockResolvedValue(null);

      await expect(
        service.getActivityTemplateById({ uuid: 'non-existent' }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException on DB error', async () => {
      prismaService.activity.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(
        service.getActivityTemplateById({ uuid: 'some-uuid' }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException with fallback message when error has no message', async () => {
      prismaService.activity.findFirst.mockRejectedValue({});

      await expect(
        service.getActivityTemplateById({ uuid: 'some-uuid' }),
      ).rejects.toThrow(RpcException);
    });
  });
});
