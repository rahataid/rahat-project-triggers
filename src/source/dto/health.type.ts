export type SourceStatus = 'UP' | 'DOWN' | 'DEGRADED';
export type SourceValidity = 'VALID' | 'STALE' | 'EXPIRED';
// interfaces/health.interface.ts
export interface SourceHealthData {
  source_id: string;
  name: string;
  source_url: string;
  status: SourceStatus;
  last_checked: string;
  response_time_ms: number | null;
  validity: SourceValidity;
  errors: Array<{
    code: string;
    message: string;
    timestamp: string;
  }> | null;
}

export interface SourceConfig {
  source_id: string;
  name: string;
  fetch_interval_minutes: number; // How often this source is fetched
  stale_threshold_multiplier?: number; // Default: 1.5x fetch interval
}

export interface HealthCacheData {
  overall_status: SourceStatus;
  last_updated: string;
  sources: SourceHealthData[];
}
