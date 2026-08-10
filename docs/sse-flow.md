# SSE Realtime Event Stream — Complete Flow

## Overview

Server-Sent Events (SSE) enables the server to push realtime data to the browser over a single, long-lived HTTP connection. Unlike WebSocket, SSE is **unidirectional** (server → client only) and works over standard HTTP — no protocol upgrade, no special firewall rules.

In this system, SSE is used to notify the frontend dashboard when a **phase** is created or updated in the `triggers` microservice.

---

## How Connection Is Established

### Step 1: Client opens an SSE connection

The browser creates an `EventSource` object:

```js
const sse = new EventSource("https://api.example.com/v1/events/phases");
```

This sends a standard HTTP GET request with a special header:

```
GET /v1/events/phases HTTP/1.1
Host: api.example.com
Accept: text/event-stream
```

### Step 2: Server responds — keeps socket open

The NestJS `@Sse()` decorator matches the route and sends back:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Crucially, the server does NOT call `res.end()` or `socket.destroy()`**. The response is left open indefinitely. The underlying TCP socket remains alive.

## What Keeps the Connection Alive

Three mechanisms work together:

### 1. HTTP Keep-Alive (TCP level)

The OS TCP stack keeps the socket open. Both sides send periodic **TCP keepalive probes** to detect dead connections. Default timeout varies:

- Linux: ~7200s (2 hours) before probing
- macOS: ~7200s
- Can be tuned via `tcp_keepalive_time` (Linux) or socket options in Node.js

### 2. No Response End

The NestJS `@Sse()` returns an `Observable`. The connection stays alive as long as the Observable is not completed/errored. The teardown callback (`return () => {}`) only runs when:

- Client disconnects (tab closed, navigated away)
- Server calls `subscriber.complete()` or `subscriber.error()`

### 3. Browser EventSource Auto-Reconnect

If the connection drops for any reason, `EventSource` automatically opens a new connection after a short delay (1-3 seconds). This is built into the browser — no code needed.

---

## Connect / Disconnect Tracking

### Connection lifecycle maps directly to SSE Observable teardown

```ts
@Sse('v1/events/phases')
phases(@Req() req): Observable<MessageEvent> {
  const userId = req.user.id;
  const sessionId = crypto.randomUUID();  // unique per connection

  this.userStatus.trackConnect(userId, sessionId);

  return new Observable((subscriber) => {
    this.redis.subscribe('phase:events');
    this.redis.on('message', (channel, message) => {
      if (channel === 'phase:events') subscriber.next({ data: message });
    });

    // This runs when client DISCONNECTS
    return () => {
      this.redis.unsubscribe('phase:events');
      this.redis.off('message', onMessage);
      this.userStatus.trackDisconnect(userId, sessionId);
    };
  });
}
```

| Browser event       | TCP behavior           | SSE Observable                                       |
| ------------------- | ---------------------- | ---------------------------------------------------- |
| Page loaded         | Socket opens           | `subscribe()` called — tracking starts               |
| Tab stays open      | Socket alive           | Active — streaming events                            |
| Tab closed          | TCP `FIN` sent         | Teardown fires — tracking marks offline              |
| Browser crash       | TCP `RST` sent         | Teardown fires (may be delayed by keepalive timeout) |
| Navigate away       | Socket closes          | Teardown fires — tracking marks offline              |
| Network drop        | TCP timeout (~30-120s) | Teardown fires after timeout                         |
| Page loaded (again) | New socket opens       | New Observable — new tracking starts                 |

### Handling multiple tabs

```ts
class UserStatusTracker {
  private userConnections = new Map<string, Set<string>>();

  trackConnect(userId: string, sessionId: string) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
      this.broadcastStatus(userId, "online");
    }
    this.userConnections.get(userId)!.add(sessionId);
  }

  trackDisconnect(userId: string, sessionId: string) {
    const sessions = this.userConnections.get(userId);
    if (!sessions) return;
    sessions.delete(sessionId);
    if (sessions.size === 0) {
      this.userConnections.delete(userId);
      this.broadcastStatus(userId, "offline");
    }
  }
}
```

Key behavior: user stays `online` as long as **at least one tab** has the SSE connection open.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌───────────────────────┐      ┌──────────────────────────────-┐   │
│  │   Triggers Micro      │      │   API Gateway (apps/api)      │   │
│  │   (apps/triggers)     │      │                               │   │
│  │                       │      │   ┌────────────────────────┐  │   │
│  │   Phase CRUD          │      │   │ EventsController       │  │   │
│  │   ↓                   │      │   │                        │  │   │
│  │   Prisma write        │      │   │  @Sse('/events/phases')│  │   │
│  │   ↓                   │      │   │                        │  │   │
│  │   Redis PUBLISH       │      │   │  Redis SUBSCRIBE       │  │   │
│  │   "phase:events"──────┼──────┼──►  "phase:events"         │  │   │
│  │                       │      │   │                        │  │   │
│  └───────────────────────┘      │   │  UserStatusTracker     │  │   │
│                                 │   └────────────────────────┘  │   │
│  ┌───────────────────────┐      │                               │   │
│  │   PostgreSQL          │      │   ↑ SSE (HTTP)                │   │
│  └───────────────────────┘      │   │                           │   │
│                                 │   ┌────────────────────────┐  │   │
│                                 │   │   Client (Browser)     │  │   │
│                                 │   │                        │  │   │
│                                 │   │  new EventSource()     │  │   │
│                                 │   │  onmessage → dashboard │  │   │
│                                 │   └────────────────────────┘  │   │
│                                 └──────────────────────────────-┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Step by Step)

### Step 1: Client opens SSE connection

```js
// Frontend code
const sse = new EventSource(`${API_URL}/v1/events/phases`);

sse.onmessage = (event) => {
  const { event: type, data } = JSON.parse(event.data);
  if (type === "phase.created") dashboard.addPhase(data);
  if (type === "phase.updated") dashboard.updatePhase(data.uuid, data);
};

sse.onerror = () => console.log("Reconnecting...");
```

### Step 2: API Gateway receives connection

```
TCP:  3-way handshake (SYN, SYN-ACK, ACK)
HTTP: GET /v1/events/phases with Accept: text/event-stream
      → @Sse() handler fires
      → EventController.phases() called
      → Redis SUBSCRIBE "phase:events"
      → Observable returned (socket stays open)
```

### Step 3: Triggers microservice publishes event

An external system sends a Redis MessagePattern to create/update a phase:

```
Redis MessagePattern: ms.jobs.phases.create
  → PhasesController.create()
  → PhasesService.create()
      → Prisma: INSERT INTO phase ...
      → Redis: PUBLISH "phase:events" {
          "event": "phase.created",
          "data": { "uuid": "...", "name": "...", ... },
          "timestamp": "2026-07-23T10:30:00.000Z"
        }
      → return created phase
```

### Step 4: API Gateway receives via Redis

```
Redis subscriber on "phase:events" fires callback
  → redis.on('message', callback)
  → message = '{"event":"phase.created","data":{...},"timestamp":"..."}'
  → subscriber.next({ data: JSON.parse(message) })
  → Server writes to the open TCP socket:

    data: {"event":"phase.created","data":{...},"timestamp":"..."}

  → Response is flushed immediately (no buffering)
```

### Step 5: Client receives via SSE

```
Browser's EventSource parser reads the TCP stream
  → Detects complete SSE message block (ends with \n\n)
  → Fires onmessage event
  → event.data = '{"event":"phase.created","data":{...},"timestamp":"..."}'
  → Dashboard updates UI with new phase data
```

---

## API Gateway Receives — Detailed

The API Gateway (`apps/api`) is a standard NestJS HTTP server. It:

1. **Runs** `EventController` under the hood as a long-lived HTTP handler
2. **Subscribes** to Redis `phase:events` channel once per client connection
3. **Bridges** Redis messages → SSE chunks on the open TCP socket

Multiple clients each get their own subscription:

```
Client A ─── SSE (socket A) ─── api gateway ─── Redis SUB (channel)
Client B ─── SSE (socket B) ─── api gateway ─── Redis SUB (channel)
Client C ─── SSE (socket C) ─── api gateway ─── Redis SUB (channel)

When redis message arrives → all 3 sockets get the write
```

---

## Client Receives — Detailed

The `EventSource` browser API:

1. **Parses** the SSE protocol from the TCP stream
2. **Buffers** incomplete messages until `\n\n` delimiter
3. **Fires** `onmessage` for complete messages
4. **Auto-reconnects** on connection drop (with `Last-Event-ID` header)
5. **Cleans up** when `eventSource.close()` is called or tab closes

SSE wire format:

```
id: 2026-07-23T10:30:00.000Z
event: phase.created
data: {"uuid":"abc-123","name":"Phase 1","riverBasin":"koshi"}

```

The `EventSource` automatically parses `id`, `event`, and `data` fields. You access them as `event.lastEventId`, `event.type`, `event.data`.

---

## Connection Lifecycle Summary

```
                    ┌───────────────┐
                    │ Page Load     │
                    │ (online)      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ EventSource   │
                    │ connect()     │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
    ┌─────────────────┐       ┌─────────────────┐
    │ Connection OK   │       │ Connection Fail │
    │ → subscribe     │       │ → retry (3s)    │
    │ → keep alive    │       │ → back off      │
    └────────┬────────┘       └────────┬────────┘
             │                         │
             ▼                         │
    ┌─────────────────┐                │
    │ Tab Close /     │◄───────────────┘
    │ Browser Quit    │
    │ (offline)       │
    │ → unsubscribe   │
    │ → cleanup       │
    └─────────────────┘
```
