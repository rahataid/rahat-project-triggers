import { Logger } from '@nestjs/common';
import { tryCatchAsync, isErr } from '../types/result.type';
import {
  DataSourceValue,
  DataSourceConfigValue,
  SourceType,
  URLConfig,
  DataSourceConfigType,
  DataSourceType,
} from '@lib/database';
import { SettingsService } from '../settings';

export interface ConfigPath {
  dataSource: keyof DataSourceValue;
  sourceType?: SourceType;
}

export interface ExtractedConfig {
  config: any;
  url: string | null;
}

export abstract class ConfigurationManager {
  public static readonly logger = new Logger('ConfigurationManager');
  private static dataSourceValue: DataSourceValue | null = null;
  private static dataSourceConfigValue: DataSourceConfigValue | null = null;
  private static isConfigLoading = false;
  private static configLoadPromise: Promise<void> | null = null;

  protected abstract readonly settingsService: SettingsService;

  protected async ensureConfigLoaded(): Promise<void> {
    if (this.hasConfigCached()) {
      return;
    }

    if (this.isLoadingInProgress()) {
      await ConfigurationManager.configLoadPromise;
      return;
    }

    await this.loadConfigFromDatabase();
  }

  private hasConfigCached(): boolean {
    return (
      ConfigurationManager.dataSourceValue !== null &&
      ConfigurationManager.dataSourceConfigValue !== null
    );
  }

  private isLoadingInProgress(): boolean {
    return (
      ConfigurationManager.isConfigLoading &&
      ConfigurationManager.configLoadPromise !== null
    );
  }

  private async loadConfigFromDatabase(): Promise<void> {
    ConfigurationManager.isConfigLoading = true;
    ConfigurationManager.configLoadPromise = this.fetchAllSettings();

    try {
      await ConfigurationManager.configLoadPromise;
      this.logConfigLoadSuccess();
    } finally {
      ConfigurationManager.isConfigLoading = false;
      ConfigurationManager.configLoadPromise = null;
    }
  }

  private async fetchAllSettings(): Promise<void> {
    this.logConfigLoadStart();

    await Promise.all([
      this.fetchDataSourceSetting(),
      this.fetchDataSourceConfigSetting(),
    ]);
  }

  private async fetchDataSourceSetting(): Promise<void> {
    const result = await tryCatchAsync<DataSourceType | null>(async () => {
      ConfigurationManager.logger.log('Fetching DATASOURCE setting...');

      const settings = (await this.settingsService.getByName(
        'DATASOURCE',
      )) as unknown as DataSourceType;

      if (!settings) {
        ConfigurationManager.logger.error('DATASOURCE setting not found');
        return null;
      }

      ConfigurationManager.logger.log(
        'DATASOURCE setting fetched successfully',
      );
      return settings;
    });

    if (isErr(result)) {
      ConfigurationManager.logger.error(
        `Failed to fetch DATASOURCE setting: ${result.error}`,
      );
      throw new Error(result.error);
    }

    ConfigurationManager.dataSourceValue = result.data?.value ?? null;
  }

  private async fetchDataSourceConfigSetting(): Promise<void> {
    const result = await tryCatchAsync<DataSourceConfigType | null>(
      async () => {
        ConfigurationManager.logger.log('Fetching DATASOURCECONFIG setting...');

        const settings = (await this.settingsService.getByName(
          'DATASOURCECONFIG',
        )) as unknown as DataSourceConfigType;

        if (!settings) {
          ConfigurationManager.logger.error(
            'DATASOURCECONFIG setting not found',
          );
          return null;
        }

        ConfigurationManager.logger.log(
          'DATASOURCECONFIG setting fetched successfully',
        );
        return settings;
      },
    );

    if (isErr(result)) {
      ConfigurationManager.logger.error(
        `Failed to fetch DATASOURCECONFIG setting: ${result.error}`,
      );
      throw new Error(result.error);
    }
    ConfigurationManager.dataSourceConfigValue = result.data?.value ?? null;
  }

  protected extractConfigForPath(configPath: ConfigPath): ExtractedConfig {
    if (!this.hasConfigCached()) {
      ConfigurationManager.logger.error('No config cached');
      return { config: null, url: null };
    }

    const { dataSource, sourceType } = configPath;

    const config = this.extractDataSourceConfig(dataSource, sourceType);
    const url = this.extractDataSourceConfigUrl(dataSource, sourceType);

    return { config, url };
  }

  private extractDataSourceConfig(
    dataSource: keyof DataSourceValue,
    sourceType?: SourceType,
  ): any {
    const config = ConfigurationManager.dataSourceValue![dataSource];

    if (!sourceType || !config) {
      return config;
    }

    if (Array.isArray(config)) {
      return config.map((item: any) => item[sourceType]).filter(Boolean);
    }

    if (typeof config === 'object' && sourceType in config) {
      return (config as any)[sourceType];
    }

    return config;
  }

  private extractDataSourceConfigUrl(
    dataSource: keyof DataSourceValue,
    sourceType?: SourceType,
  ): string | null {
    const configValue = ConfigurationManager.dataSourceConfigValue!;
    let config = configValue[dataSource] as URLConfig;

    if (
      sourceType &&
      config &&
      typeof config === 'object' &&
      sourceType in config
    ) {
      config = (config as any)[sourceType] as URLConfig;
    }

    return config?.URL || null;
  }

  static clearCache(): void {
    ConfigurationManager.dataSourceValue = null;
    ConfigurationManager.dataSourceConfigValue = null;
    ConfigurationManager.logger.log('Configuration cache cleared');
  }

  static getCachedDataSource(): DataSourceValue | null {
    return ConfigurationManager.dataSourceValue;
  }

  static getCachedDataSourceConfig(): DataSourceConfigValue | null {
    return ConfigurationManager.dataSourceConfigValue;
  }

  private logConfigLoadStart(): void {
    ConfigurationManager.logger.log(
      'Loading configuration from database (singleton)...',
    );
  }

  private logConfigLoadSuccess(): void {
    ConfigurationManager.logger.log('Configuration loaded successfully');
  }

  protected logConfigExtraction(
    adapterName: string,
    dataSource: string,
    sourceType?: SourceType,
  ): void {
    ConfigurationManager.logger.log(
      `Config extracted for ${adapterName} - DataSource: ${dataSource}, SourceType: ${sourceType || 'N/A'}`,
    );
  }
}
