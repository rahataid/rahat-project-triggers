import { Result } from '../types/result.type';
import { Indicator } from '../types/indicator.type';
import { HttpService } from '@nestjs/axios';
import { OnModuleInit } from '@nestjs/common';
import { SettingsService } from 'settings';
import { ConfigurationManager, ConfigPath } from './configuration-manager';
import { AdapterHealthConfig } from '../types/health.type';
import { HealthMonitoringService } from '../services/health-monitoring.service';

export abstract class ObservationAdapter<TParams = any>
  extends ConfigurationManager
  implements OnModuleInit
{
  dataSourceUrl: string | null = null;
  config: any = null;

  private configPath: ConfigPath | null = null;
  public healthService?: HealthMonitoringService;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly settingsService: SettingsService,
    configPath: ConfigPath | null = null,
  ) {
    super();
    this.configPath = configPath;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConfigLoaded();
    this.extractInstanceConfig();
    await this.init();
  }

  private extractInstanceConfig(): void {
    if (!this.configPath) {
      return;
    }

    const { dataSource, sourceType } = this.configPath;
    const extracted = this.extractConfigForPath(this.configPath);

    if (extracted.config) {
      this.config = extracted.config;
    } else {
      ConfigurationManager.logger.error(
        `No config found for ${this.constructor.name} ${dataSource} ${sourceType}`,
      );
    }
    if (extracted.url) {
      this.dataSourceUrl = extracted.url;
    } else {
      ConfigurationManager.logger.error(
        `No url found for ${this.constructor.name} ${dataSource} ${sourceType}`,
      );
    }

    this.logConfigExtraction(this.constructor.name, dataSource, sourceType);
  }

  abstract init(): Promise<void>;

  abstract fetch(params: TParams): Promise<Result<unknown>>;
  abstract aggregate(rawData: unknown): Result<unknown>;
  abstract transform(aggregatedData: unknown): Result<Indicator[]>;
  abstract execute(params: TParams): Promise<Result<Indicator[]>>;

  abstract getAdapterId(): string;

  protected getUrl(): string | null {
    return this.dataSourceUrl;
  }

  protected setUrl(url: string): void {
    this.dataSourceUrl = url;
  }

  getConfig(): any {
    return this.config;
  }

  setConfig(config: any): void {
    this.config = config;
  }

  setHealthService(service: HealthMonitoringService): void {
    this.healthService = service;
  }

  registerHealthConfig(config: AdapterHealthConfig): void {
    if (this.healthService) {
      this.healthService.registerAdapter(config);
    } else {
      console.log('Health service not set');
    }
  }
}
