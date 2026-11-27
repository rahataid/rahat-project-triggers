import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';

describe('CommunicationController', () => {
  let controller: CommunicationController;
  let service: any;

  const mockCommunicationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationController],
      providers: [
        {
          provide: CommunicationService,
          useValue: mockCommunicationService,
        },
      ],
    }).compile();

    controller = module.get<CommunicationController>(CommunicationController);
    service = module.get(CommunicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate the payload to the service', async () => {
      const payload = {
        title: 'Flood warning broadcast',
        groupId: 'group-1',
        groupType: 'BENEFICIARY' as any,
      };
      service.create.mockResolvedValue({ uuid: 'comm-uuid-1', ...payload });

      const result = await controller.create(payload);

      expect(service.create).toHaveBeenCalledWith(payload);
      expect(result.uuid).toBe('comm-uuid-1');
    });
  });

  describe('getAll', () => {
    it('should delegate the filters to the service', async () => {
      const payload = { page: 1, perPage: 10 };
      service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.getAll(payload);

      expect(service.findAll).toHaveBeenCalledWith(payload);
      expect(result.data).toEqual([]);
    });
  });

  describe('getOne', () => {
    it('should pass the uuid through to the service', async () => {
      service.findOne.mockResolvedValue({ uuid: 'comm-uuid-1' });

      const result = await controller.getOne({ uuid: 'comm-uuid-1' });

      expect(service.findOne).toHaveBeenCalledWith('comm-uuid-1');
      expect(result.uuid).toBe('comm-uuid-1');
    });
  });

  describe('update', () => {
    it('should split the uuid from the update payload', async () => {
      service.update.mockResolvedValue({
        uuid: 'comm-uuid-1',
        title: 'Updated title',
      });

      const result = await controller.update({
        uuid: 'comm-uuid-1',
        title: 'Updated title',
      });

      expect(service.update).toHaveBeenCalledWith('comm-uuid-1', {
        title: 'Updated title',
      });
      expect(result.title).toBe('Updated title');
    });
  });

  describe('remove', () => {
    it('should pass the uuid through to the service', async () => {
      service.remove.mockResolvedValue({
        uuid: 'comm-uuid-1',
        isDeleted: true,
      });

      const result = await controller.remove({ uuid: 'comm-uuid-1' });

      expect(service.remove).toHaveBeenCalledWith('comm-uuid-1');
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('error propagation', () => {
    it('should let service errors bubble up', async () => {
      service.findOne.mockRejectedValue(new Error('not found'));

      await expect(controller.getOne({ uuid: 'missing' })).rejects.toThrow(
        'not found',
      );
    });
  });
});
