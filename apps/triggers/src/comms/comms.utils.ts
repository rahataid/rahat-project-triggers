import { SessionStatus } from '@rumsan/connect';

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

export function determineSessionStatus(
  fallbackStatus: string = SessionStatus.COMPLETED,
  counts: BroadcastCounts | null = null,
  hasError = false,
): string {
  if (hasError) return SessionStatus.FAILED;
  if (!counts || counts.TOTAL === 0) return fallbackStatus;
  if (counts.PENDING + counts.SCHEDULED > 0) return SessionStatus.PENDING;
  if (counts.FAIL > 0 && counts.SUCCESS === 0) return SessionStatus.FAILED;
  return SessionStatus.COMPLETED;
}

export async function batchFetchSessionStatuses(
  commsClient: any,
  sessionIds: string[],
  _chunkSize = 25,
  _timeoutMs = 6000,
  xrefId?: string,
): Promise<Map<string, SessionStatusResult>> {
  const cache = new Map<string, SessionStatusResult>();
  const uniqueIds = Array.from(new Set(sessionIds.filter(Boolean)));

  if (!commsClient || uniqueIds.length === 0) {
    return cache;
  }

  const { data: broadcasts } = await commsClient.broadcast.list({
    ...(xrefId && xrefId !== 'all' && { xref: xrefId }),
    perPage: 1000,
  });

  const countsBySession = new Map<string, BroadcastCounts>();
  const updatedAtBySession = new Map<string, string>();

  if (Array.isArray(broadcasts)) {
    for (const b of broadcasts) {
      if (!b.session) continue;
      if (!countsBySession.has(b.session)) {
        countsBySession.set(b.session, {
          SUCCESS: 0,
          FAIL: 0,
          PENDING: 0,
          SCHEDULED: 0,
          TOTAL: 0,
        });
      }
      const c = countsBySession.get(b.session)!;
      c.TOTAL++;
      if (b.status === 'SUCCESS') c.SUCCESS++;
      else if (b.status === 'FAIL') c.FAIL++;
      else if (b.status === 'SCHEDULED') c.SCHEDULED++;
      else c.PENDING++;

      if (b.updatedAt || b.createdAt) {
        updatedAtBySession.set(b.session, b.updatedAt || b.createdAt);
      }
    }
  }

  const EMPTY_COUNTS: BroadcastCounts = {
    SUCCESS: 0,
    FAIL: 0,
    PENDING: 0,
    SCHEDULED: 0,
    TOTAL: 0,
  };

  for (const sid of uniqueIds) {
    const counts = countsBySession.get(sid) ?? EMPTY_COUNTS;
    cache.set(sid, {
      status: determineSessionStatus(SessionStatus.COMPLETED, counts),
      counts,
      updatedAt: updatedAtBySession.get(sid),
    });
  }

  return cache;
}
