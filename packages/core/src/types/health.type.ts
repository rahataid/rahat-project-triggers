export type HealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';

export type ExecutionStatus = 'success' | 'partial' | 'failure';

export type ExecutionStage = 'fetch' | 'aggregate' | 'transform';

export type SourceValidity = 'VALID' | 'STALE' | 'EXPIRED';

export interface ItemError {
  itemId: string;
  itemName?: string;
  stage: ExecutionStage;
  code: string;
  message: string;
  timestamp: string;
}

export interface ExecutionContext {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  itemErrors?: ItemError[];
}

export interface ExecutionReport {
  adapterId: string;
  timestamp: Date;
  duration: number;
  status: ExecutionStatus;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  itemErrors: ItemError[];
  globalError?: {
    code: string;
    message: string;
  };
}

export interface ItemStatistics {
  successCount: number;
  failureCount: number;
  lastError?: ItemError;
}

export interface AdapterHealthStatus {
  adapterId: string;
  name: string;
  sourceUrl: string;
  currentStatus: HealthStatus;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  last_checked: Date | null;
  fetch_frequency_minutes: number;
  response_time_ms: number;
  validity: SourceValidity;
  successCount: number;
  failureCount: number;
  partialSuccessCount: number;
  averageDuration: number;
  errors: ItemError[];
  itemStatistics: Record<string, ItemStatistics>;
}

export interface AdapterHealthConfig {
  adapterId: string;
  name: string;
  dataSource: string;
  sourceType?: string;
  sourceUrl: string;
  fetchIntervalMinutes: number;
  staleThresholdMultiplier: number;
}

export interface HealthCacheInterface {
  setAdapterConfig(config: AdapterHealthConfig): Promise<void>;
  updateHealthStatus(
    adapterId: string,
    status: AdapterHealthStatus,
  ): Promise<void>;
  recordItemError(adapterId: string, error: ItemError): Promise<void>;
  updateItemStatistics(
    adapterId: string,
    itemId: string,
    stats: ItemStatistics,
  ): Promise<void>;
  getHealthStatus(adapterId: string): Promise<AdapterHealthStatus | null>;
  getAllHealthStatuses(): Promise<HealthDataResult>;
}

export interface HealthDataResult {
  overall_status: HealthStatus;
  last_updated: string;
  sources: AdapterHealthStatus[];
}
