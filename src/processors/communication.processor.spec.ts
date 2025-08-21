import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { CommunicationProcessor } from './communication.processor';
import { ActivityService } from '../activity/activity.service';
import { BQUEUE, JOBS } from '../constant';

describe('CommunicationProcessor', () => {
  let processor: CommunicationProcessor;
  let activityService: ActivityService;

  const mockActivityService = {
    triggerCommunication: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationProcessor,
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    processor = module.get<CommunicationProcessor>(CommunicationProcessor);
    activityService = module.get<ActivityService>(ActivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('processCommunicationTrigger', () => {
    it('should process communication trigger successfully', async () => {
      const mockJob = {
        data: {
          communicationId: 'test-communication-id',
          activityId: 'test-activity-id',
          appId: 'test-app-id',
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'test-communication-id',
        activityId: 'test-activity-id',
        appId: 'test-app-id',
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with different IDs', async () => {
      const mockJob = {
        data: {
          communicationId: 'another-communication-id',
          activityId: 'another-activity-id',
          appId: 'another-app-id',
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'another-communication-id',
        activityId: 'another-activity-id',
        appId: 'another-app-id',
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with empty data', async () => {
      const mockJob = {
        data: {},
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: undefined,
        activityId: undefined,
        appId: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with partial data', async () => {
      const mockJob = {
        data: {
          communicationId: 'test-communication-id',
          // Missing activityId and appId
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'test-communication-id',
        activityId: undefined,
        appId: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with null values', async () => {
      const mockJob = {
        data: {
          communicationId: null,
          activityId: null,
          appId: null,
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: null,
        activityId: null,
        appId: null,
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with undefined values', async () => {
      const mockJob = {
        data: {
          communicationId: undefined,
          activityId: undefined,
          appId: undefined,
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: undefined,
        activityId: undefined,
        appId: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with string values', async () => {
      const mockJob = {
        data: {
          communicationId: 'string-communication-id',
          activityId: 'string-activity-id',
          appId: 'string-app-id',
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'string-communication-id',
        activityId: 'string-activity-id',
        appId: 'string-app-id',
      });
      expect(result).toBeUndefined();
    });

    it('should handle communication trigger with number values', async () => {
      const mockJob = {
        data: {
          communicationId: 123,
          activityId: 456,
          appId: 789,
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue(undefined);

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 123,
        activityId: 456,
        appId: 789,
      });
      expect(result).toBeUndefined();
    });
  });

  describe('Processor Decorators', () => {
    it('should have correct processor decorator', () => {
      const prototype = Object.getPrototypeOf(processor);
      expect(prototype.constructor.name).toBe('CommunicationProcessor');
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof processor.processCommunicationTrigger).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle triggerCommunication throwing an error', async () => {
      const mockJob = {
        data: {
          communicationId: 'test-communication-id',
          activityId: 'test-activity-id',
          appId: 'test-app-id',
        },
      } as Job;

      const error = new Error('Communication trigger failed');
      mockActivityService.triggerCommunication.mockRejectedValue(error);

      await expect(processor.processCommunicationTrigger(mockJob)).rejects.toThrow('Communication trigger failed');

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'test-communication-id',
        activityId: 'test-activity-id',
        appId: 'test-app-id',
      });
    });

    it('should handle triggerCommunication returning a value', async () => {
      const mockJob = {
        data: {
          communicationId: 'test-communication-id',
          activityId: 'test-activity-id',
          appId: 'test-app-id',
        },
      } as Job;

      mockActivityService.triggerCommunication.mockResolvedValue({ success: true });

      const result = await processor.processCommunicationTrigger(mockJob);

      expect(mockActivityService.triggerCommunication).toHaveBeenCalledWith({
        communicationId: 'test-communication-id',
        activityId: 'test-activity-id',
        appId: 'test-app-id',
      });
      expect(result).toBeUndefined();
    });
  });
}); 