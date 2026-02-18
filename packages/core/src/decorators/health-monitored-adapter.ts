import { Logger } from '@nestjs/common';
import { ObservationAdapter } from '../interfaces/observation-adapter.interface';
import { Result } from '../types/result.type';
import { Indicator } from '../types/indicator.type';
import { HealthMonitoringService } from '../services/health-monitoring.service';
import { ExecutionReport, ExecutionStatus } from '../types/health.type';

export class HealthMonitoredAdapter<TParams = any> {
  private readonly logger = new Logger(HealthMonitoredAdapter.name);

  constructor(
    private readonly adapter: ObservationAdapter<TParams>,
    private readonly healthService: HealthMonitoringService,
    private readonly adapterId: string,
  ) {}

  async execute(params?: TParams): Promise<Result<Indicator[]>> {
    const startTime = Date.now();

    try {
      const result = await this.adapter.execute(params!);
      const duration = Date.now() - startTime;

      const report = this.buildExecutionReport(result, duration);
      await this.healthService.recordExecution(report);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorReport = this.buildErrorReport(error, duration);
      await this.healthService.recordExecution(errorReport);

      throw error;
    }
  }

  private buildExecutionReport(
    result: Result<Indicator[]>,
    duration: number,
  ): ExecutionReport {
    const context = result.executionContext;
    const totalItems = context?.totalItems || 1;
    const successfulItems =
      context?.successfulItems || (result.success ? 1 : 0);
    const failedItems = context?.failedItems || (result.success ? 0 : 1);
    const itemErrors = context?.itemErrors || [];

    let status: ExecutionStatus;
    if (result.success) {
      if (failedItems > 0) {
        status = 'partial';
      } else {
        status = 'success';
      }
    } else {
      status = 'failure';
    }

    const report: ExecutionReport = {
      adapterId: this.adapterId,
      timestamp: new Date(),
      duration,
      status,
      totalItems,
      successfulItems,
      failedItems,
      itemErrors,
    };

    if (!result.success) {
      report.globalError = {
        code: 'EXECUTION_FAILED',
        message: result.error,
      };
    }

    return report;
  }

  private buildErrorReport(error: any, duration: number): ExecutionReport {
    return {
      adapterId: this.adapterId,
      timestamp: new Date(),
      duration,
      status: 'failure',
      totalItems: 1,
      successfulItems: 0,
      failedItems: 1,
      itemErrors: [],
      globalError: {
        code: 'UNEXPECTED_ERROR',
        message: error.message || 'Unknown error',
      },
    };
  }

  getAdapter(): ObservationAdapter<TParams> {
    return this.adapter;
  }

  getAdapterId(): string {
    return this.adapterId;
  }
}
