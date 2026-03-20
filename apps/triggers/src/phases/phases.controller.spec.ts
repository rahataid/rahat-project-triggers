jest.mock('cheerio', () => ({
  load: jest.fn().mockReturnValue({
    text: jest.fn(),
    html: jest.fn(),
  }),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@lib/database';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { TriggerService } from 'src/trigger/trigger.service';
import { MS_TRIGGER_CLIENTS } from 'src/constant';

describe('PhasesController', () => {
  let controller: PhasesController;

  const mockPrismaService = {
    phase: {
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

  const mockContractQueue = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
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

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
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
          provide: 'BullQueue_CONTRACT',
          useValue: mockContractQueue,
        },
        {
          provide: 'BullQueue_COMMUNICATION',
          useValue: mockCommunicationQueue,
        },
        {
          provide: MS_TRIGGER_CLIENTS.RAHAT,
          useValue: mockClientProxy,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<PhasesController>(PhasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('update', () => {
    it('should call phasesService.update with payload', async () => {
      const payload = {
        uuid: 'phase-uuid',
        name: 'ACTIVATION' as any,
        canRevert: true,
        canTriggerPayout: false,
      };
      const mockResult = { ...payload, isActive: false };
      jest
        .spyOn(controller['phasesService'], 'update')
        .mockResolvedValue(mockResult as any);

      const result = await controller.update(payload);

      expect(controller['phasesService'].update).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResult);
    });

    it('should propagate RpcException from phasesService.update', async () => {
      jest
        .spyOn(controller['phasesService'], 'update')
        .mockRejectedValue(new Error('Phase not found'));

      await expect(
        controller.update({ uuid: 'bad-uuid' }),
      ).rejects.toThrow('Phase not found');
    });
  });

  describe('delete', () => {
    it('should call phasesService.delete with uuid', async () => {
      const mockResult = { uuid: 'phase-uuid', name: 'Test Phase' };
      jest
        .spyOn(controller['phasesService'], 'delete')
        .mockResolvedValue(mockResult as any);

      const result = await controller.delete({ uuid: 'phase-uuid' });

      expect(controller['phasesService'].delete).toHaveBeenCalledWith(
        'phase-uuid',
      );
      expect(result).toEqual(mockResult);
    });

    it('should propagate RpcException from phasesService.delete', async () => {
      jest
        .spyOn(controller['phasesService'], 'delete')
        .mockRejectedValue(new Error('Cannot delete an active phase'));

      await expect(
        controller.delete({ uuid: 'phase-uuid' }),
      ).rejects.toThrow('Cannot delete an active phase');
    });
  });
});
