import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import {
  PrismaService,
  TriggerCallbackStatus,
  TriggerCallbackType,
} from '@lib/database';
import type { Queue } from 'bull';
import { TriggerCallbackDispatcher } from './trigger-callback.dispatcher';
import { BQUEUE, CORE_MODULE } from 'src/constant';
import type { CallbackDispatchJobData } from './types';

describe('TriggerCallbackDispatcher', () => {
  let dispatcher: TriggerCallbackDispatcher;

  const mockPrismaService = {
    triggerCallback: {
      findUnique: jest.fn(),
    },
    triggerCallbackLog: {
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      findUnique: jest.fn(),
    },
  };

  const mockHttpService = {
    axiosRef: {
      request: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
  };

  const mockCommunicationQueue: jest.Mocked<Partial<Queue>> = {
    add: jest.fn() as any,
  };

  const baseJob: CallbackDispatchJobData = {
    callbackUuid: 'cb-1',
    triggerUuid: 'trigger-1',
    appId: 'app-1',
    context: {
      event: 'trigger.activated',
      triggeredAt: new Date().toISOString(),
      trigger: {
        uuid: 'trigger-1',
        repeatKey: 'rk-1',
        title: 'Test Trigger',
        logicKey: null,
        source: 'MANUAL',
        isMandatory: true,
        triggeredBy: 'user-1',
        triggerStatement: {},
      },
      phase: null,
      appId: 'app-1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerCallbackDispatcher,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CORE_MODULE, useValue: mockClientProxy },
        {
          provide: `BullQueue_${BQUEUE.COMMUNICATION}`,
          useValue: mockCommunicationQueue,
        },
      ],
    }).compile();

    dispatcher = module.get<TriggerCallbackDispatcher>(
      TriggerCallbackDispatcher,
    );

    mockPrismaService.triggerCallbackLog.create.mockResolvedValue({
      uuid: 'log-1',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(dispatcher).toBeDefined();
  });

  it('skips dispatch when the callback was deleted between enqueue and processing', async () => {
    mockPrismaService.triggerCallback.findUnique.mockResolvedValue(null);

    await dispatcher.dispatch(baseJob, 1);

    expect(mockPrismaService.triggerCallbackLog.create).not.toHaveBeenCalled();
  });

  describe('WEBHOOK', () => {
    it('marks the log SUCCESS on a 2xx response and signs the body when a secret is set', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.WEBHOOK,
        config: { url: 'https://example.com/hook', secret: 'shh' },
      });
      mockHttpService.axiosRef.request.mockResolvedValue({
        status: 200,
        data: { ok: true },
      });

      await dispatcher.dispatch(baseJob, 1);

      const [[requestArgs]] = mockHttpService.axiosRef.request.mock.calls;
      expect(requestArgs.url).toBe('https://example.com/hook');
      expect(requestArgs.headers['X-Rahat-Signature']).toMatch(/^sha256=/);

      expect(mockPrismaService.triggerCallbackLog.update).toHaveBeenCalledWith({
        where: { uuid: 'log-1' },
        data: expect.objectContaining({ status: TriggerCallbackStatus.SUCCESS }),
      });
    });

    it('marks the log FAILED and rethrows so Bull retries when the request rejects', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.WEBHOOK,
        config: { url: 'https://example.com/hook' },
      });
      mockHttpService.axiosRef.request.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(dispatcher.dispatch(baseJob, 1)).rejects.toThrow(
        'connect ECONNREFUSED',
      );

      expect(mockPrismaService.triggerCallbackLog.update).toHaveBeenCalledWith({
        where: { uuid: 'log-1' },
        data: expect.objectContaining({ status: TriggerCallbackStatus.FAILED }),
      });
    });
  });

  describe('MS_EVENT', () => {
    it('sends the cmd via ClientProxy and logs SUCCESS', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.MS_EVENT,
        config: { cmd: 'rahat.jobs.example', appId: 'app-2' },
      });
      mockClientProxy.send.mockReturnValue(of({ ok: true }));

      await dispatcher.dispatch(baseJob, 1);

      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'rahat.jobs.example', uuid: 'app-2' },
        expect.objectContaining({ event: 'trigger.activated' }),
      );
      expect(mockPrismaService.triggerCallbackLog.update).toHaveBeenCalledWith({
        where: { uuid: 'log-1' },
        data: expect.objectContaining({ status: TriggerCallbackStatus.SUCCESS }),
      });
    });

    it('marks the log FAILED when the microservice call errors', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.MS_EVENT,
        config: { cmd: 'rahat.jobs.example' },
      });
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('rpc failed')),
      );

      await expect(dispatcher.dispatch(baseJob, 1)).rejects.toThrow(
        'rpc failed',
      );
    });
  });

  describe('INTERNAL_EVENT', () => {
    it('emits the configured event and logs SUCCESS', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.INTERNAL_EVENT,
        config: {
          event: 'events.notification.create',
          payload: { title: 'hi' },
        },
      });

      await dispatcher.dispatch(baseJob, 1);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'events.notification.create',
        { title: 'hi' },
      );
    });
  });

  describe('ACTIVITY_COMMUNICATION', () => {
    it('enqueues one communication job per matching entry', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
        config: { activityUuid: 'activity-1' },
      });
      mockPrismaService.activity.findUnique.mockResolvedValue({
        uuid: 'activity-1',
        app: 'app-1',
        activityCommunication: [
          { communicationId: 'comm-1' },
          { communicationId: 'comm-2' },
        ],
      });

      await dispatcher.dispatch(baseJob, 1);

      expect(mockCommunicationQueue.add).toHaveBeenCalledTimes(2);
      expect(mockCommunicationQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          communicationId: 'comm-1',
          activityId: 'activity-1',
          appId: 'app-1',
        }),
        expect.any(Object),
      );
    });

    it('only enqueues communications listed in communicationIds when provided', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
        config: { activityUuid: 'activity-1', communicationIds: ['comm-2'] },
      });
      mockPrismaService.activity.findUnique.mockResolvedValue({
        uuid: 'activity-1',
        app: 'app-1',
        activityCommunication: [
          { communicationId: 'comm-1' },
          { communicationId: 'comm-2' },
        ],
      });

      await dispatcher.dispatch(baseJob, 1);

      expect(mockCommunicationQueue.add).toHaveBeenCalledTimes(1);
      expect(mockCommunicationQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ communicationId: 'comm-2' }),
        expect.any(Object),
      );
    });

    it('fails when the activity does not exist', async () => {
      mockPrismaService.triggerCallback.findUnique.mockResolvedValue({
        uuid: 'cb-1',
        isDeleted: false,
        type: TriggerCallbackType.ACTIVITY_COMMUNICATION,
        config: { activityUuid: 'missing-activity' },
      });
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(dispatcher.dispatch(baseJob, 1)).rejects.toThrow(
        'Activity missing-activity not found',
      );
    });
  });
});
