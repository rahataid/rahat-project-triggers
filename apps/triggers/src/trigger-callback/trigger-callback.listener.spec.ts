import { Test, TestingModule } from '@nestjs/testing';
import { TriggerCallbackListener } from './trigger-callback.listener';
import { TriggerCallbackService } from './trigger-callback.service';

describe('TriggerCallbackListener', () => {
  let listener: TriggerCallbackListener;

  const mockTriggerCallbackService = {
    removeByTrigger: jest.fn(),
    removeByActivity: jest.fn(),
    pruneCommunications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerCallbackListener,
        { provide: TriggerCallbackService, useValue: mockTriggerCallbackService },
      ],
    }).compile();

    listener = module.get(TriggerCallbackListener);
  });

  afterEach(() => jest.clearAllMocks());

  it('removes callbacks of a deleted trigger', async () => {
    mockTriggerCallbackService.removeByTrigger.mockResolvedValue({ count: 2 });

    await listener.onTriggerDeleted({ triggerUuid: 'trigger-1' });

    expect(mockTriggerCallbackService.removeByTrigger).toHaveBeenCalledWith(
      'trigger-1',
    );
  });

  it('removes callbacks linked to a deleted activity', async () => {
    mockTriggerCallbackService.removeByActivity.mockResolvedValue({ count: 1 });

    await listener.onActivityDeleted({ activityUuid: 'activity-1' });

    expect(mockTriggerCallbackService.removeByActivity).toHaveBeenCalledWith(
      'activity-1',
    );
  });

  it('prunes callbacks when communications are removed from an activity', async () => {
    await listener.onActivityCommunicationsRemoved({
      activityUuid: 'activity-1',
      communicationIds: ['comm-1'],
    });

    expect(mockTriggerCallbackService.pruneCommunications).toHaveBeenCalledWith(
      'activity-1',
      ['comm-1'],
    );
  });

  it('ignores events without an id', async () => {
    await listener.onTriggerDeleted({});
    await listener.onActivityDeleted({});
    await listener.onActivityCommunicationsRemoved({ activityUuid: 'a' });

    expect(mockTriggerCallbackService.removeByTrigger).not.toHaveBeenCalled();
    expect(mockTriggerCallbackService.removeByActivity).not.toHaveBeenCalled();
    expect(mockTriggerCallbackService.pruneCommunications).not.toHaveBeenCalled();
  });

  it('swallows errors so the emitting request never fails', async () => {
    mockTriggerCallbackService.removeByTrigger.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      listener.onTriggerDeleted({ triggerUuid: 'trigger-1' }),
    ).resolves.toBeUndefined();
  });
});
