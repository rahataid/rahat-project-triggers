import { NotificationProcessor } from './notification.processor';
import { ClientProxy } from '@nestjs/microservices';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let clientProxy: jest.Mocked<ClientProxy>;

  beforeEach(() => {
    // mock client proxy
    clientProxy = {
      send: jest.fn(),
    } as any;

    processor = new NotificationProcessor(clientProxy);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should process a notification successfully', async () => {
    const payload = { message: 'hello' };
    const job = { data: payload } as Job;

    clientProxy.send.mockReturnValueOnce(of('ok'));

    await processor.handleNotification(job);

    expect(clientProxy.send).toHaveBeenCalledWith(
      { cmd: 'rahat.jobs.notification.create' },
      payload,
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('✅ Notification delivered: ok'),
    );
  });

  it('should log and throw error when processing fails', async () => {
    const payload = { message: 'fail' };
    const job = { data: payload } as Job;

    clientProxy.send.mockReturnValueOnce(throwError(() => new Error('boom')));

    await expect(processor.handleNotification(job)).rejects.toThrow('boom');

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ Notification job failed'),
      expect.any(String),
    );
  });
});
