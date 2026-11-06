import { SessionStatus, TriggerType } from '@rumsan/connect';

export interface BroadcastCounts {
  SUCCESS: number;
  FAIL: number;
  PENDING: number;
  SCHEDULED: number;
  TOTAL: number;
}

export interface SessionStatusResult {
  status: string;
  counts: BroadcastCounts | null;
  updatedAt?: string;
}

export async function batchFetchSessionStatuses(
  commsClient: any,
  sessionIds: string[],
  chunkSize = 25,
  _timeoutMs = 6000,
  _xrefId?: string,
): Promise<Map<string, SessionStatusResult>> {
  const cache = new Map<string, SessionStatusResult>();
  const uniqueIds = Array.from(new Set(sessionIds.filter(Boolean)));

  if (!commsClient || uniqueIds.length === 0) {
    return cache;
  }

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);

    await Promise.allSettled(
      chunk.map(async (sid) => {
        try {
          const [sessionRes, countRes] = await Promise.allSettled([
            typeof commsClient.session?.get === 'function'
              ? commsClient.session.get(sid)
              : Promise.reject(new Error('session.get unavailable')),
            typeof commsClient.session?.broadcastCount === 'function'
              ? commsClient.session.broadcastCount({ sessions: [sid] })
              : Promise.reject(new Error('broadcastCount unavailable')),
          ]);

          const session =
            sessionRes.status === 'fulfilled'
              ? sessionRes.value?.data?.data ??
                sessionRes.value?.data ??
                sessionRes.value
              : null;

          const rawCount =
            countRes.status === 'fulfilled'
              ? countRes.value?.data?.data ??
                countRes.value?.data ??
                countRes.value
              : null;

          const counts: BroadcastCounts | null = rawCount
            ? {
                SUCCESS: Number(rawCount.SUCCESS || 0),
                FAIL: Number(rawCount.FAIL || 0),
                PENDING: Number(rawCount.PENDING || 0),
                SCHEDULED: Number(rawCount.SCHEDULED || 0),
                TOTAL: Number(rawCount.TOTAL || 0),
              }
            : null;

          if (!session) {
            cache.set(sid, {
              status: SessionStatus.FAILED,
              counts: null,
            });
            return;
          }

          const rawStatus = String(session.status || '').toUpperCase();
          const triggerType = String(session.triggerType || '').toUpperCase();
          const isScheduled =
            triggerType === TriggerType.SCHEDULED ||
            (counts !== null &&
              counts.SCHEDULED > 0 &&
              counts.PENDING === 0 &&
              counts.SUCCESS === 0);

          let resolvedStatus: string;
          if (rawStatus === SessionStatus.FAILED || rawStatus === 'FAILED') {
            resolvedStatus = SessionStatus.FAILED;
          } else if (
            rawStatus === SessionStatus.COMPLETED ||
            rawStatus === 'COMPLETED'
          ) {
            resolvedStatus = SessionStatus.COMPLETED;
          } else if (isScheduled && rawStatus !== SessionStatus.COMPLETED) {
            resolvedStatus = 'SCHEDULED';
          } else if (
            rawStatus === SessionStatus.PENDING ||
            rawStatus === 'PENDING'
          ) {
            resolvedStatus = SessionStatus.PENDING;
          } else {
            resolvedStatus = isScheduled ? 'SCHEDULED' : SessionStatus.PENDING;
          }

          cache.set(sid, {
            status: resolvedStatus,
            counts,
            updatedAt:
              session.updatedAt?.toString() ||
              session.createdAt?.toString() ||
              undefined,
          });
        } catch {
          cache.set(sid, {
            status: SessionStatus.FAILED,
            counts: null,
          });
        }
      }),
    );
  }

  return cache;
}
