import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SettingsService } from '@rumsan/settings';
import {
  dhmRainfallWatchUrl,
  dhmRiverWatchUrl,
  gfhUrl,
  glofasUrl,
} from 'src/constant/datasourceUrls';
import { DataSource } from '@prisma/client';
import { DataSourceValue } from 'src/types/settings';
import { HealthCacheService } from 'src/source/health-cache.service';
import { SourceConfig } from 'src/source/dto/health.type';
import { HealthUtilsService } from './utils/health-utils.service';
import { DhmStationProcessorService } from './utils/dhm-station-processor.service';
import { GlofasStationProcessorService } from './utils/glofas-station-processor.service';
import { GfhStationProcessorService } from './utils/gfh-station-processor.service';

@Injectable()
export class ScheduleSourcesDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  constructor(
    private readonly healthCacheService: HealthCacheService,
    private readonly healthUtilsService: HealthUtilsService,
    private readonly dhmStationProcessor: DhmStationProcessorService,
    private readonly glofasStationProcessor: GlofasStationProcessorService,
    private readonly gfhStationProcessor: GfhStationProcessorService,
  ) {}
  onApplicationBootstrap() {
    this.syncRiverWaterData();
    this.syncRainfallData();
    this.synchronizeGlofas();
    this.syncGlobalFloodHub();
    this.initializeSourceConfigs();
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRiverWaterData() {
    this.logger.log('Syncing river water data');

    const config = {
      sourceId: 'DHM:WATER-LEVEL',
      name: 'DHM Water Level API',
      sourceUrl: dhmRiverWatchUrl,
      startTimestamp: new Date(),
    };

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      const isValid = await this.healthUtilsService.validateSettings(
        dhmSettings,
        config,
        'DHM',
      );
      if (!isValid) return;

      const tasks = this.dhmStationProcessor.createWaterLevelTasks(dhmSettings);

      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (task, errors) => {
          return await this.dhmStationProcessor.processWaterLevelStation(
            task.config,
            task.seriesId,
            errors,
          );
        },
      );

      await this.healthUtilsService.storeHealthResult(config, result);
    } catch (error) {
      await this.healthUtilsService.handleTopLevelError(
        config,
        error,
        'DHM_WATER_SYNC_ERROR',
      );
    }
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRainfallData() {
    this.logger.log('Syncing rainfall data');

    const config = {
      sourceId: 'DHM:RAINFALL',
      name: 'DHM Rainfall API',
      sourceUrl: dhmRainfallWatchUrl,
      startTimestamp: new Date(),
    };

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      const isValid = await this.healthUtilsService.validateSettings(
        dhmSettings,
        config,
        'DHM',
      );
      if (!isValid) return;

      const tasks = this.dhmStationProcessor.createRainfallTasks(dhmSettings);

      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (task, errors) => {
          return await this.dhmStationProcessor.processRainfallStation(
            task.config,
            task.seriesId,
            errors,
          );
        },
      );

      await this.healthUtilsService.storeHealthResult(config, result);
    } catch (error) {
      await this.healthUtilsService.handleTopLevelError(
        config,
        error,
        'DHM_RAINFALL_SYNC_ERROR',
      );
    }
  }

  //run every 24 hours
  @Cron('0 0 * * *')
  async syncGlobalFloodHub() {
    this.logger.log('Starting flood data fetching process...');

    const config = {
      sourceId: 'GFH',
      name: 'GFH API',
      sourceUrl: gfhUrl,
      startTimestamp: new Date(),
    };

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const gfhSettings = dataSource[DataSource.GFH];

      const isValid = await this.healthUtilsService.validateSettings(
        gfhSettings,
        config,
        'GFH',
      );
      if (!isValid) return;

      // Fetch all gauges
      const gauges = await this.gfhStationProcessor.fetchGauges();

      // Create processing tasks
      const tasks = this.gfhStationProcessor.createGfhTasks(gfhSettings);

      // Process stations in parallel
      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (task, errors) => {
          return await this.gfhStationProcessor.processGfhStation(
            task,
            gauges,
            errors,
          );
        },
      );

      await this.healthUtilsService.storeHealthResult(config, result);
    } catch (error) {
      await this.healthUtilsService.handleTopLevelError(
        config,
        error,
        'GFH_SYNC_ERROR',
      );
    }
  }

  // run every hour
  @Cron('0 * * * *')
  async synchronizeGlofas() {
    this.logger.log('GLOFAS: syncing Glofas data');

    const config = {
      sourceId: 'GLOFAS',
      name: 'Glofas API',
      sourceUrl: glofasUrl,
      startTimestamp: new Date(),
    };

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const glofasSettings = dataSource[DataSource.GLOFAS];

      const isValid = await this.healthUtilsService.validateSettings(
        glofasSettings,
        config,
        'GLOFAS',
      );
      if (!isValid) return;

      const tasks =
        this.glofasStationProcessor.createGlofasTasks(glofasSettings);

      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (glofasStation, errors) => {
          return await this.glofasStationProcessor.processGlofasStation(
            glofasStation,
            errors,
          );
        },
      );

      await this.healthUtilsService.storeHealthResult(config, result);
    } catch (error) {
      await this.healthUtilsService.handleTopLevelError(
        config,
        error,
        'GLOFAS_SYNC_ERROR',
      );
    }
  }

  /**
   * Initialize source configurations with their fetch intervals
   */
  private async initializeSourceConfigs(): Promise<void> {
    const sourceConfigs: SourceConfig[] = [
      {
        source_id: 'DHM:WATER-LEVEL',
        name: 'DHM Water Level API',
        fetch_interval_minutes: 15, // Every 15 minutes
        stale_threshold_multiplier: 1.5, // STALE after 22.5 minutes, EXPIRED after that
      },
      {
        source_id: 'DHM:RAINFALL',
        name: 'DHM Rainfall API',
        fetch_interval_minutes: 15, // Every 15 minutes
        stale_threshold_multiplier: 1.5, // STALE after 22.5 minutes, EXPIRED after that
      },
      {
        source_id: 'GLOFAS',
        name: 'Glofas API',
        fetch_interval_minutes: 1440, // Once per day (24 hours)
        stale_threshold_multiplier: 1.1, // STALE after 26.4 hours, EXPIRED after that
      },
      {
        source_id: 'GFH',
        name: 'GFH API',
        fetch_interval_minutes: 1440, // Every 15 minutes
        stale_threshold_multiplier: 1.1, // STALE after 158.4 hours, EXPIRED after that
      },
    ];

    for (const config of sourceConfigs) {
      await this.healthCacheService.setSourceConfig(config);
    }
  }
}
