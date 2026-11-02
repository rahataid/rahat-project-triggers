import { Test, TestingModule } from '@nestjs/testing';
import { MicroserviceAuthGuard } from '@rumsan/user/ability/ms-rpc-auth';
import { TriggerCallbackController } from './trigger-callback.controller';
import { TriggerCallbackService } from './trigger-callback.service';

describe('TriggerCallbackController', () => {
  let controller: TriggerCallbackController;

  const mockService = {
    create: jest.fn(),
    findAllForTrigger: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getLogs: jest.fn(),
    replay: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriggerCallbackController],
      providers: [{ provide: TriggerCallbackService, useValue: mockService }],
    })
      .overrideGuard(MicroserviceAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TriggerCallbackController>(
      TriggerCallbackController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to the service', () => {
    const payload = { triggerId: 't-1' } as any;
    controller.create(payload);
    expect(mockService.create).toHaveBeenCalledWith(payload);
  });

  it('findAll delegates to findAllForTrigger with the triggerId', () => {
    controller.findAll({ triggerId: 't-1' });
    expect(mockService.findAllForTrigger).toHaveBeenCalledWith('t-1');
  });

  it('findOne delegates to the service', () => {
    controller.findOne({ uuid: 'cb-1' });
    expect(mockService.findOne).toHaveBeenCalledWith('cb-1');
  });

  it('update delegates to the service', () => {
    const payload = { uuid: 'cb-1' } as any;
    controller.update(payload);
    expect(mockService.update).toHaveBeenCalledWith(payload);
  });

  it('remove delegates to the service', () => {
    const payload = { uuid: 'cb-1' };
    controller.remove(payload);
    expect(mockService.remove).toHaveBeenCalledWith(payload);
  });

  it('getLogs delegates to the service', () => {
    const payload = { callbackId: 'cb-1' };
    controller.getLogs(payload);
    expect(mockService.getLogs).toHaveBeenCalledWith(payload);
  });

  it('replay delegates to the service with callbackUuid', () => {
    controller.replay({ callbackUuid: 'cb-1' });
    expect(mockService.replay).toHaveBeenCalledWith('cb-1');
  });
});
