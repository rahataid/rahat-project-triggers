import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { SSE_EVENTS } from 'src/constant';

@Injectable()
export class SseService {
  constructor(@Inject(SSE_EVENTS.PUBLISHER) private readonly redis: Redis) {}

  async publishEvent(event: string, data: any) {
    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
    await this.redis.publish('phase:events', message);
  }
}
