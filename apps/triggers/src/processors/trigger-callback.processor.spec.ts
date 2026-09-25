import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bull';
import { TriggerCallbackProcessor } from './trigger-callback.processor';
import { TriggerCallbackDispatcher } from '../trigger-callback/trigger-callback.dispatcher';
import type { CallbackDispatchJobData } from '../trigger-callback/types';

describe('TriggerCallbackProcessor', () => {
  let processor: TriggerCallbackProcessor;

  const mockDispatcher = {
    dispatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerCallbackProcessor,
        { provide: TriggerCallbackDispatcher, useValue: mockDispatcher },
      ],
    }).compile();

    processor = module.get<TriggerCallbackProcessor>(
      TriggerCallbackProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('dispatches the job data with a 1-indexed attempt number', async () => {
    const jobData: CallbackDispatchJobData = {
      callbackUuid: 'cb-1',
      triggerUuid: 'trigger-1',
      context: {} as any,
    };
    const mockJob = { data: jobData, attemptsMade: 2 } as Job<
      CallbackDispatchJobData
    >;

    await processor.processCallbackDispatch(mockJob);

    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(jobData, 3);
  });
});
