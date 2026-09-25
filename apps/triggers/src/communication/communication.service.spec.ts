import { PrismaService } from '@lib/database';
import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationService } from './communication.service';

const mockCommunication = {
  id: 1,
  uuid: 'comm-uuid-1',
  xrefId: 'xref-1',
  title: 'Flood warning broadcast',
  message: 'Water levels are rising.',
  subject: 'Urgent: flood warning',
  audioURL: null,
  sessionId: null,
  transportId: 'transport-1',
  groupId: 'group-1',
  groupType: 'BENEFICIARY',
  isDeleted: false,
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: null,
};

describe('CommunicationService', () => {
  let service: CommunicationService;
  let prisma: any;

  const mockPrismaService = {
    communication: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CommunicationService>(CommunicationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should persist the communication', async () => {
      prisma.communication.create.mockResolvedValue(mockCommunication);

      const dto = {
        title: 'Flood warning broadcast',
        groupId: 'group-1',
        groupType: 'BENEFICIARY' as any,
      };
      const result = await service.create(dto);

      expect(prisma.communication.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(mockCommunication);
    });

    it('should persist the audio payload as a plain object', async () => {
      prisma.communication.create.mockResolvedValue(mockCommunication);

      await service.create({
        title: 'Voice blast',
        groupId: 'group-1',
        groupType: 'BENEFICIARY' as any,
        audioURL: { mediaURL: 'https://cdn/a.mp3', fileName: 'a.mp3' },
      });

      expect(prisma.communication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          audioURL: { mediaURL: 'https://cdn/a.mp3', fileName: 'a.mp3' },
        }),
      });
    });

    it('should drop keys the bus appends, such as the injected user', async () => {
      prisma.communication.create.mockResolvedValue(mockCommunication);

      await service.create({
        title: 'Flood warning broadcast',
        groupId: 'group-1',
        groupType: 'BENEFICIARY' as any,
        user: { id: 1, name: 'Raghav', roles: ['Admin'] },
        appId: 'some-app-uuid',
      } as any);

      expect(prisma.communication.create).toHaveBeenCalledWith({
        data: {
          title: 'Flood warning broadcast',
          groupId: 'group-1',
          groupType: 'BENEFICIARY',
        },
      });
    });

    it('should wrap persistence failures in an RpcException', async () => {
      prisma.communication.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({
          title: 'Flood warning broadcast',
          groupId: 'group-1',
          groupType: 'BENEFICIARY' as any,
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.communication.count.mockResolvedValue(1);
      prisma.communication.findMany.mockResolvedValue([mockCommunication]);
    });

    it('should exclude soft deleted records and paginate', async () => {
      const result = await service.findAll({ page: 2, perPage: 5 });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
          take: 5,
          skip: 5,
        }),
      );
      expect(result.data).toEqual([mockCommunication]);
      expect(result.meta.total).toBe(1);
    });

    it('should apply the supported filters', async () => {
      await service.findAll({
        title: 'flood',
        xrefId: 'xref-1',
        groupId: 'group-1',
        groupType: 'BENEFICIARY' as any,
        transportId: 'transport-1',
        sessionId: 'session-1',
      });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isDeleted: false,
            title: { contains: 'flood', mode: 'insensitive' },
            xrefId: 'xref-1',
            groupId: 'group-1',
            groupType: 'BENEFICIARY',
            transportId: 'transport-1',
            sessionId: 'session-1',
          },
        }),
      );
    });

    it('should default to sorting by createdAt descending', async () => {
      await service.findAll({});

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should fall back to createdAt when the sort field is not sortable', async () => {
      await service.findAll({ sort: 'notAColumn', order: 'asc' });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });

    it('should honour a whitelisted sort field', async () => {
      await service.findAll({ sort: 'title', order: 'asc' });

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } }),
      );
    });

    it('should wrap query failures in an RpcException', async () => {
      prisma.communication.count.mockRejectedValue(new Error('db down'));

      await expect(service.findAll({})).rejects.toThrow(RpcException);
    });
  });

  describe('findOne', () => {
    it('should return the communication', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);

      const result = await service.findOne('comm-uuid-1');

      expect(prisma.communication.findFirst).toHaveBeenCalledWith({
        where: { uuid: 'comm-uuid-1', isDeleted: false },
      });
      expect(result).toEqual(mockCommunication);
    });

    it('should throw when the communication does not exist', async () => {
      prisma.communication.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(RpcException);
    });
  });

  describe('update', () => {
    it('should update an existing communication', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);
      prisma.communication.update.mockResolvedValue({
        ...mockCommunication,
        title: 'Updated title',
      });

      const result = await service.update('comm-uuid-1', {
        title: 'Updated title',
      });

      expect(prisma.communication.update).toHaveBeenCalledWith({
        where: { uuid: 'comm-uuid-1' },
        data: { title: 'Updated title' },
      });
      expect(result.title).toBe('Updated title');
    });

    it('should drop bus-appended keys on update too', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);
      prisma.communication.update.mockResolvedValue(mockCommunication);

      await service.update('comm-uuid-1', {
        title: 'Updated title',
        user: { id: 1, name: 'Raghav' },
      } as any);

      expect(prisma.communication.update).toHaveBeenCalledWith({
        where: { uuid: 'comm-uuid-1' },
        data: { title: 'Updated title' },
      });
    });

    it('should not update a communication that does not exist', async () => {
      prisma.communication.findFirst.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'Updated title' }),
      ).rejects.toThrow(RpcException);
      expect(prisma.communication.update).not.toHaveBeenCalled();
    });

    it('should wrap update failures in an RpcException', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);
      prisma.communication.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('comm-uuid-1', { title: 'Updated title' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('remove', () => {
    it('should soft delete the communication', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);
      prisma.communication.update.mockResolvedValue({
        ...mockCommunication,
        isDeleted: true,
      });

      const result = await service.remove('comm-uuid-1');

      expect(prisma.communication.update).toHaveBeenCalledWith({
        where: { uuid: 'comm-uuid-1' },
        data: { isDeleted: true },
      });
      expect(result.isDeleted).toBe(true);
    });

    it('should not remove a communication that does not exist', async () => {
      prisma.communication.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(RpcException);
      expect(prisma.communication.update).not.toHaveBeenCalled();
    });

    it('should wrap delete failures in an RpcException', async () => {
      prisma.communication.findFirst.mockResolvedValue(mockCommunication);
      prisma.communication.update.mockRejectedValue(new Error('db down'));

      await expect(service.remove('comm-uuid-1')).rejects.toThrow(RpcException);
    });
  });
});
