# SSE Realtime Phase Updates — System Flow

## Overview

Push phase create/update events from the `triggers` microservice to browser clients in real time using **Server-Sent Events (SSE)**.

Architecture: `triggers` (Redis microservice) —[Redis Pub/Sub]→ `api` (HTTP gateway) —[SSE]→ Client

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│  new EventSource('/v1/events/phases')                       │
│    → onmessage: update dashboard                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE (HTTP)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (apps/api)                         │
│  @Sse('v1/events/phases')                                   │
│    → subscribes to Redis channel "phase:events"             │
│    → streams events to connected clients                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Redis PUB/SUB
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Triggers Microservice (apps/triggers)            │
│  PhasesService.create() / update()                          │
│    → Prisma write                                           │
│    → Redis PUBLISH "phase:events" { event, data, ts }      │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Step by Step)

### 1. Phase Created/Updated

External system sends Redis MessagePattern to triggers microservice:

```
→ Redis msg: ms.jobs.phases.create / ms.jobs.phases.update
```

### 2. Triggers Service Handles

`PhasesController.create()` → `PhasesService.create()`:

```
1. Validate payload
2. Prisma write to phase table
3. Redis PUBLISH to "phase:events" channel
4. Return created phase
```

### 3. Redis Pub/Sub

Triggers microservice publishes a message to `phase:events` channel:

```json
{
  "event": "phase.created",
  "data": { "uuid": "...", "name": "Phase 1", "riverBasin": "...", ... },
  "timestamp": "2026-07-23T10:30:00.000Z"
}
```

### 4. API Gateway Receives

API gateway has a Redis subscriber listening on `phase:events`. On message:

```
1. Receive JSON from Redis
2. Push to all connected SSE clients
```

### 5. Client Receives

Browser `EventSource` fires `onmessage`:

```
→ Client updates dashboard with fresh phase data
```

---

## Implementation Plan

### Part A: Triggers Microservice — Add Redis Publish

**File: `apps/triggers/src/phases/phases.service.ts`**

Inject Redis client:

```typescript
import Redis from 'ioredis';

constructor(
  // ... existing deps
  @Inject('REDIS_PUBLISHER') private readonly redisPublisher: Redis,
) {}
```

Add a helper method:

```typescript
private async publishPhaseEvent(event: string, data: any) {
  const message = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });
  await this.redisPublisher.publish('phase:events', message);
}
```

Call it after create/update succeeds:

```typescript
// Inside create() — after Prisma write succeeds
const phase = await this.prisma.phase.create({ ... });
await this.publishPhaseEvent('phase.created', phase);
return phase;

// Inside update() — after Prisma write succeeds
const updated = await this.prisma.phase.update({ ... });
await this.publishPhaseEvent('phase.updated', updated);
return updated;
```

**File: `apps/triggers/src/phases/phases.module.ts`**

Register Redis publish client:

```typescript
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

{
  provide: 'REDIS_PUBLISHER',
  useFactory: (config: ConfigService) => new Redis({
    host: config.get('REDIS_HOST'),
    port: Number(config.get('REDIS_PORT')),
    password: config.get('REDIS_PASSWORD'),
  }),
  inject: [ConfigService],
}
```

---

### Part B: API Gateway — Add SSE Endpoint

**Step 1: Add dependencies**

```bash
pnpm add @nestjs/microservices ioredis --filter api
```

**Step 2: Register Redis subscriber client**

**File: `apps/api/src/app.module.ts`**

```typescript
import { ClientsModule, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // ... existing
    ClientsModule.register([
      {
        name: 'REDIS_SUBSCRIBER_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      },
    ]),
  ],
  providers: [
    // ... existing
    {
      provide: 'REDIS_SUBSCRIBER',
      useFactory: (config: ConfigService) => {
        const client = new Redis({
          host: config.get('REDIS_HOST'),
          port: Number(config.get('REDIS_PORT')),
          password: config.get('REDIS_PASSWORD'),
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
```

**Step 3: Create EventsController**

**File: `apps/api/src/events/events.controller.ts`**

```typescript
import { Controller, Inject, Sse } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('v1/events')
export class EventsController {
  constructor(
    @Inject('REDIS_SUBSCRIBER') private readonly redis: Redis,
  ) {}

  @Sse('phases')
  phases(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const onMessage = (channel: string, message: string) => {
        if (channel === 'phase:events') {
          const parsed = JSON.parse(message);
          subscriber.next({
            data: parsed,
            id: parsed.timestamp,
          } as MessageEvent);
        }
      };

      this.redis.subscribe('phase:events', (err) => {
        if (err) subscriber.error(err);
      });
      this.redis.on('message', onMessage);

      return () => {
        this.redis.unsubscribe('phase:events');
        this.redis.off('message', onMessage);
      };
    });
  }
}
```

**Step 4: Register module**

**File: `apps/api/src/app.module.ts`**

```typescript
import { EventsController } from './events/events.controller';

@Module({
  controllers: [AppController, EventsController],
})
```

---

### Part C: Client Consumption

```typescript
// Browser / React / Vue / any JS client
const eventSource = new EventSource(
  `${process.env.NEXT_PUBLIC_API_URL}/v1/events/phases`
);

eventSource.onmessage = (event) => {
  const { event: type, data, timestamp } = JSON.parse(event.data);

  if (type === 'phase.created') {
    // Add phase to dashboard list
    dashboardStore.addPhase(data);
  }

  if (type === 'phase.updated') {
    // Update phase in dashboard list
    dashboardStore.updatePhase(data.uuid, data);
  }
};

eventSource.onerror = (err) => {
  console.error('SSE connection error', err);
  // EventSource auto-reconnects
};
```

---

## SSE vs WebSocket — Decision Rationale

| Concern | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server→client only (perfect match) | Bidirectional (unused) |
| Dependencies | Already have `@nestjs/platform-express` (built-in `@Sse()`) | Need `@nestjs/platform-socket.io` + `socket.io` |
| Subscription model | 1 Redis channel = 1 SSE stream | Need socket.io-redis adapter for multi-instance |
| Client API | Native `EventSource` (no library) | Need `socket.io` client npm package |
| Auto-reconnect | Built-in browser behavior | Manual implementation |
| Scaling | Works with standard HTTP load balancers | Requires sticky sessions or Redis adapter |
| Resource per client | 1 HTTP connection | 1 WebSocket connection |

---

## Scaling Considerations

### Single Instance
No changes needed — SSE + Redis sub works out of the box.

### Multiple API Gateway Instances
Each instance subscribes to `phase:events` independently. Every instance receives every event and broadcasts to its connected clients. **Correct behavior** — no duplicate issue since each client is connected to only one instance.

No sticky sessions, no additional infra.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Redis connection lost | SSE stream stays open; events queue in Redis. On reconnect, subscriber catches up (or misses events published during downtime — acceptable for realtime dashboard) |
| Client disconnects | EventSource fires `onerror`, auto-reconnects after 1-3s. Missed events are not replayed (acceptable — dashboard can refresh manually or poll) |
| API gateway restart | All SSE connections drop. Clients auto-reconnect on EventSource retry interval |
| Redis PUBLISH fails in triggers service | Phase CRUD still succeeds (no rollback). Dashboard may have stale data until next event or manual refresh |
