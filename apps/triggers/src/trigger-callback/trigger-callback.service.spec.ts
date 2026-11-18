import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService, TriggerCallbackType } from '@lib/database';
import type { Queue } from 'bull';
import { TriggerCallbackService } from './trigger-callback.service';
import { BQUEUE } from 'src/constant';

describe('TriggerCallbackService', () => {
  let service: TriggerCallbackService;

  const mockPrismaService = {
    trigger: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    triggerCallback: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    triggerCallbackLog: {
      findMany: jest.fn(),
    },
    activity: {
      update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const mockCallbackQueue: jest.Mocked<Partial<Queue>> = {
    add: jest.fn() as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerCallbackService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: `BullQueue_${BQUEUE.TRIGGER_CALLBACK}`,
          useValue: mockCallbackQueue,
        },
      ],
    }).compile();

    service = module.get<TriggerCallbackService>(TriggerCallbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a callback when the trigger exists and config is valid', async () => {
      mockPrismaService.trigger.findMany.mockResolvedValue([
        { uuid: 'trigger-1' },
      ]);
      mockPrismaService.triggerCallback.create.mockResolvedValue({
        uuid: 'cb-1',
      });

      const result = await service.create([
        {
          triggerId: 'trigger-1',
          type: TriggerCallbackType.WEBHOOK,
          config: { url: 'https://example.com/hook' },
        } as any,
      ]);

      expect(mockPrismaService.triggerCallback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerId: 'trigger-1',
          type: TriggerCallbackType.WEBHOOK,
          isActive: true,
          order: 0,
        }),
      });
      expect(result).toEqual([{ uuid: 'cb-1' }]);
    });

    it('rejects an invalid config for the given type', async () => {
      await expect(
        service.create([
          {
            triggerId: 'trigger-1',
            type: TriggerCallbackType.WEBHOOK,
            config: { url: 'not-a-url' },
          } as any,
        ]),
      ).rejects.toThrow(RpcException);

      expect(mockPrismaService.triggerCallback.create).not.toHaveBeenCalled();
    });

    it('rejects when the trigger does not exist', async () => {
      mockPrismaService.trigger.findMany.mockResolvedValue([]);

      await expect(
        service.create([
          {
            triggerId: 'missing-trigger',
            type: TriggerCallbackType.INTERNAL_EVENT,
            config: { event: 'events.notification.create' },
          } as any,
        ]),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('updateByXref', () => {
    it('deletes existing callbacks for xrefId and recreates the replacement set', async () => {
      mockPrismaService.trigger.findMany.mockResolvedValue([
        { uuid: 'trigger-1' },
        { uuid: 'trigger-2' },
      ]);
      mockPrismaService.triggerCallback.deleteMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.triggerCallback.create
        .mockResolvedValueOnce({ uuid: 'cb-new-1' })
        .mockResolvedValueOnce({ uuid: 'cb-new-2' });

      const result = await service.updateByXref({
        xrefId: 'activity-1',
        triggerCallbackConfig: [
          {
            triggerId: 'trigger-1',
            type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
            config: {},
            xref: 'activity-1',
          },
          {
            triggerId: 'trigger-2',
            type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
            config: {},
            xref: 'activity-1',
          },
        ],
      } as any);

      expect(mockPrismaService.triggerCallback.deleteMany).toHaveBeenCalledWith(
        { where: { xref: 'activity-1' } },
      );
      expect(mockPrismaService.triggerCallback.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-1' },
        data: { hasTriggerCallback: true },
      });
      expect(result).toEqual([{ uuid: 'cb-new-1' }, { uuid: 'cb-new-2' }]);
    });

    it('clears all callbacks for xrefId when triggerCallbackConfig is empty', async () => {
      mockPrismaService.triggerCallback.deleteMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.updateByXref({
        xrefId: 'activity-1',
        triggerCallbackConfig: [],
      } as any);

      expect(mockPrismaService.triggerCallback.deleteMany).toHaveBeenCalledWith(
        { where: { xref: 'activity-1' } },
      );
      expect(mockPrismaService.triggerCallback.create).not.toHaveBeenCalled();
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-1' },
        data: { hasTriggerCallback: false },
      });
      expect(result).toEqual([]);
    });

    it('rejects when xrefId is missing', async () => {
      await expect(
        service.updateByXref({
          xrefId: '',
          triggerCallbackConfig: [
            {
              triggerId: 'trigger-1',
              type: TriggerCallbackType.INTERNAL_EVENT,
              config: { event: 'events.notification.create' },
            },
          ],
        } as any),
      ).rejects.toThrow(RpcException);
    });

    it('rejects when a replacement trigger does not exist', async () => {
      mockPrismaService.trigger.findMany.mockResolvedValue([]);

      await expect(
        service.updateByXref({
          xrefId: 'activity-1',
          triggerCallbackConfig: [
            {
              triggerId: 'missing-trigger',
              type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
              config: {},
              xref: 'activity-1',
            },
          ],
        } as any),
      ).rejects.toThrow(RpcException);

      expect(mockPrismaService.triggerCallback.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('updateByTrigger', () => {
    it('clears hasTriggerCallback for every previously linked activity, then recreates callbacks', async () => {
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([
        {
          type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
          xref: 'activity-1',
        },
        {
          type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
          xref: 'activity-2',
        },
      ]);
      mockPrismaService.trigger.findMany.mockResolvedValue([
        { uuid: 'trigger-1' },
      ]);
      mockPrismaService.triggerCallback.deleteMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.triggerCallback.create.mockResolvedValue({
        uuid: 'cb-new-1',
      });

      const result = await service.updateByTrigger({
        triggerId: 'trigger-1',
        triggerCallbackConfig: [
          {
            triggerId: 'trigger-1',
            type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
            config: {},
            xref: 'activity-1',
          },
        ],
      } as any);

      expect(mockPrismaService.triggerCallback.findMany).toHaveBeenCalledWith({
        where: { triggerId: 'trigger-1' },
        select: { type: true, xref: true },
      });
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-1' },
        data: { hasTriggerCallback: false },
      });
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-2' },
        data: { hasTriggerCallback: false },
      });
      expect(mockPrismaService.triggerCallback.deleteMany).toHaveBeenCalledWith(
        { where: { triggerId: 'trigger-1' } },
      );
      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-1' },
        data: { hasTriggerCallback: true },
      });
      expect(result).toEqual([{ uuid: 'cb-new-1' }]);
    });

    it('clears all callbacks for triggerId when triggerCallbackConfig is empty', async () => {
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([
        {
          type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
          xref: 'activity-1',
        },
      ]);
      mockPrismaService.triggerCallback.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.updateByTrigger({
        triggerId: 'trigger-1',
        triggerCallbackConfig: [],
      } as any);

      expect(mockPrismaService.activity.update).toHaveBeenCalledWith({
        where: { uuid: 'activity-1' },
        data: { hasTriggerCallback: false },
      });
      expect(mockPrismaService.triggerCallback.deleteMany).toHaveBeenCalledWith(
        { where: { triggerId: 'trigger-1' } },
      );
      expect(mockPrismaService.triggerCallback.create).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('rejects when triggerId is missing', async () => {
      await expect(
        service.updateByTrigger({
          triggerId: '',
          triggerCallbackConfig: [],
        } as any),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('enqueueForTrigger', () => {
    it('claims and enqueues every active callback exactly once', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue({
        uuid: 'trigger-1',
        repeatKey: 'rk-1',
        title: 'Test Trigger',
        logicKey: null,
        source: 'MANUAL',
        isMandatory: true,
        triggeredBy: 'user-1',
        triggerStatement: {},
        triggeredAt: new Date('2026-01-01T00:00:00Z'),
        phase: null,
      });
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([
        { uuid: 'cb-1' },
        { uuid: 'cb-2' },
      ]);
      mockPrismaService.triggerCallback.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.enqueueForTrigger('trigger-1', 'app-1');

      expect(mockPrismaService.triggerCallback.updateMany).toHaveBeenCalledTimes(2);
      expect(mockCallbackQueue.add).toHaveBeenCalledTimes(2);
      expect(mockCallbackQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ callbackUuid: 'cb-1', triggerUuid: 'trigger-1' }),
        expect.objectContaining({ attempts: 5 }),
      );
    });

    it('does not enqueue a callback that has already been claimed (fire-once)', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue({
        uuid: 'trigger-1',
        repeatKey: 'rk-1',
        title: 'Test Trigger',
        logicKey: null,
        source: 'MANUAL',
        isMandatory: true,
        triggeredBy: 'user-1',
        triggerStatement: {},
        triggeredAt: new Date(),
        phase: null,
      });
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([
        { uuid: 'cb-1' },
      ]);
      // count: 0 simulates another caller having already flipped dispatchedAt first
      mockPrismaService.triggerCallback.updateMany.mockResolvedValue({
        count: 0,
      });

      await service.enqueueForTrigger('trigger-1');

      expect(mockCallbackQueue.add).not.toHaveBeenCalled();
    });

    it('does nothing when the trigger cannot be found', async () => {
      mockPrismaService.trigger.findUnique.mockResolvedValue(null);

      await service.enqueueForTrigger('missing-trigger');

      expect(mockPrismaService.triggerCallback.findMany).not.toHaveBeenCalled();
      expect(mockCallbackQueue.add).not.toHaveBeenCalled();
    });

    it('swallows errors so a broken callback never fails the caller', async () => {
      mockPrismaService.trigger.findUnique.mockRejectedValue(
        new Error('db down'),
      );

      await expect(
        service.enqueueForTrigger('trigger-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('cloneForNewTrigger', () => {
    it('copies active callbacks onto the new trigger with dispatchedAt reset', async () => {
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([
        {
          uuid: 'cb-1',
          type: TriggerCallbackType.WEBHOOK,
          name: 'Notify partner',
          config: { url: 'https://example.com' },
          isActive: true,
          order: 0,
          createdBy: 'user-1',
        },
      ]);

      await service.cloneForNewTrigger('trigger-old', 'trigger-new');

      expect(mockPrismaService.triggerCallback.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            triggerId: 'trigger-new',
            type: TriggerCallbackType.WEBHOOK,
            name: 'Notify partner',
          }),
        ],
      });
    });

    it('does nothing when the old trigger has no callbacks', async () => {
      mockPrismaService.triggerCallback.findMany.mockResolvedValue([]);

      await service.cloneForNewTrigger('trigger-old', 'trigger-new');

      expect(mockPrismaService.triggerCallback.createMany).not.toHaveBeenCalled();
    });
  });

  describe('replay', () => {
    it('resets dispatchedAt and re-enqueues for a fired trigger', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        triggerId: 'trigger-1',
        isDeleted: false,
        trigger: {
          uuid: 'trigger-1',
          repeatKey: 'rk-1',
          title: 'Test Trigger',
          logicKey: null,
          source: 'MANUAL',
          isMandatory: true,
          triggeredBy: 'user-1',
          triggerStatement: {},
          triggeredAt: new Date(),
          isTriggered: true,
          phase: null,
        },
      });
      mockPrismaService.triggerCallback.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.replay('cb-1');

      expect(mockPrismaService.triggerCallback.update).toHaveBeenCalledWith({
        where: { uuid: 'cb-1' },
        data: { dispatchedAt: null },
      });
      expect(mockCallbackQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ queued: true });
    });

    it('rejects when the trigger has not fired', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        triggerId: 'trigger-1',
        isDeleted: false,
        trigger: { isTriggered: false },
      });

      await expect(service.replay('cb-1')).rejects.toThrow(RpcException);
    });
  });
});
