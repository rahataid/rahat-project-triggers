import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { Cron } from '@nestjs/schedule';
import { SettingsService } from '@rumsan/settings';
import { getFormattedDate, parseGlofasData } from 'src/common';
import { GlofasService } from './glofas.service';
import { HttpService } from '@nestjs/axios';
import {
  dhmRiverWatchUrl,
  rainfallStationUrl,
  riverStationUrl,
} from 'src/constant/datasourceUrls';
import * as https from 'https';
import { RiverStationItem, RainfallStationItem } from 'src/types/data-source';
import { DataSource, SourceType } from '@prisma/client';
import { DataSourceValue } from 'src/types/settings';
import { GfhService } from './gfh.service';
import { HealthCacheService } from 'src/source/health-cache.service';
import { SourceConfig } from 'src/source/dto/health.type';
import { HealthUtilsService } from './utils/health-utils.service';
import { DhmStationProcessorService } from './utils/dhm-station-processor.service';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
@Injectable()
export class ScheduleSourcesDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  constructor(
    private readonly sourceService: SourcesDataService,
    private readonly glofasService: GlofasService,
    private readonly httpService: HttpService,
    private readonly gfhService: GfhService,
    private readonly healthCacheService: HealthCacheService,
    private readonly healthUtilsService: HealthUtilsService,
    private readonly dhmStationProcessor: DhmStationProcessorService,
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

      // Validate settings
      const isValid = await this.healthUtilsService.validateSettings(
        dhmSettings,
        config,
        'DHM',
      );
      if (!isValid) return;

      // Create processing tasks
      const tasks = this.dhmStationProcessor.createWaterLevelTasks(
        dhmSettings,
        this.fetchRiverStation.bind(this),
      );

      // Process stations in parallel
      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (task, errors) => {
          return await this.dhmStationProcessor.processWaterLevelStation(
            task.config,
            task.seriesId,
            errors,
            this.fetchRiverStation.bind(this),
          );
        },
      );

      // Store health results
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
      sourceUrl:
        'http://www.dhm.gov.np/frontend_dhm/hydrology/getRainfallWatchMapBySeriesId',
      startTimestamp: new Date(),
    };

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      // Validate settings
      const isValid = await this.healthUtilsService.validateSettings(
        dhmSettings,
        config,
        'DHM',
      );
      if (!isValid) return;

      // Create processing tasks
      const tasks = this.dhmStationProcessor.createRainfallTasks(
        dhmSettings,
        this.fetchRainfallStation.bind(this),
      );

      // Process stations in parallel
      const result = await this.healthUtilsService.processStationsInParallel(
        tasks,
        async (task, errors) => {
          return await this.dhmStationProcessor.processRainfallStation(
            task.config,
            task.seriesId,
            errors,
            this.fetchRainfallStation.bind(this),
          );
        },
      );

      // Store health results
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
    const key = `GFH`;
    const startTimestamp = new Date();
    const errors = [];
    let successfulStations = 0;
    let totalStations = 0;

    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const gfhSettings = dataSource[DataSource.GFH];

      // Step 1 : Check if GFH settings are available
      if (!gfhSettings || gfhSettings.length === 0) {
        this.logger.warn('GFH settings not found or empty');

        const healthData = await this.healthCacheService.createHealthData({
          sourceId: key,
          name: 'GFH API',
          sourceUrl: 'https://globalfloods.eu',
          status: 'DOWN',
          responseTimeMs: new Date().getTime() - startTimestamp.getTime(),
          errors: [
            {
              code: 'GFH_CONFIG_ERROR',
              message: 'GFH settings not found or empty',
              timestamp: new Date().toISOString(),
            },
          ],
        });

        await this.healthCacheService.setSourceHealth(key, healthData);
        return;
      }

      // Step 2: Fetch all gauges
      const gauges = await this.gfhService.fetchAllGauges();

      if (gauges.length === 0) {
        throw new Error('No gauges found');
      }

      // Process all stations
      const stationPromises = [];

      for (const gfhStationDetails of gfhSettings) {
        const { dateString } = getFormattedDate();

        for (const stationDetails of gfhStationDetails.STATION_LOCATIONS_DETAILS) {
          totalStations++;

          const stationPromise = (async () => {
            const stationStartTime = new Date();
            try {
              const riverBasin = gfhStationDetails.RIVER_BASIN;
              const stationName = stationDetails.STATION_NAME;

              // Step 3: Check data are already fetched
              const hasExistingRecord = await this.sourceService.findGfhData(
                riverBasin,
                dateString,
                stationName,
              );
              if (hasExistingRecord?.length) {
                this.logger.log(
                  `Global flood data for ${stationName} on ${dateString} already exists.`,
                );
                successfulStations++;
                return stationStartTime;
              }

              // Step 4: Match stations to gauges
              const [stationGaugeMapping, uniqueGaugeIds] =
                this.gfhService.matchStationToGauge(gauges, stationDetails);

              // Step 5: Process gauge data
              const gaugeDataCache =
                await this.gfhService.processGaugeData(uniqueGaugeIds);

              // Step 6: Build final output
              const output = this.gfhService.buildFinalOutput(
                stationGaugeMapping,
                gaugeDataCache,
              );

              // Step 7: Filter and process the output
              const [stationKey, stationData] = Object.entries(output)[0] || [];
              if (!stationKey || !stationData) {
                this.logger.warn(`No data found for station ${stationName}`);
                errors.push({
                  code: 'GFH_NO_DATA',
                  message: `No data found for station ${stationName}`,
                  timestamp: new Date().toISOString(),
                });
                return stationStartTime;
              }

              // Step 8: Format the data
              const gfhData = this.gfhService.formateGfhStationData(
                dateString,
                stationData,
                stationName,
                riverBasin,
              );

              // Step 9: Save the data in Global Flood Hub
              const res = await this.gfhService.saveDataInGfh(
                SourceType.WATER_LEVEL,
                riverBasin,
                gfhData,
              );

              if (res) {
                this.logger.log(
                  `Global flood data saved successfully for ${stationName}`,
                );
                successfulStations++;
              } else {
                this.logger.warn(
                  `Failed to save Global flood data for ${stationName}`,
                );
                errors.push({
                  code: 'GFH_SAVE_ERROR',
                  message: `Failed to save data for station ${stationName}`,
                  timestamp: new Date().toISOString(),
                });
              }

              return stationStartTime;
            } catch (stationError) {
              const errorMessage = stationError?.message || 'Unknown error';
              errors.push({
                code: 'GFH_STATION_ERROR',
                message: `Error processing station ${stationDetails.STATION_NAME}: ${errorMessage}`,
                timestamp: new Date().toISOString(),
              });
              this.logger.error(
                `Error processing station ${stationDetails.STATION_NAME}:`,
                errorMessage,
              );
              return stationStartTime;
            }
          })();

          stationPromises.push(stationPromise);
        }
      }

      // Wait for all stations to complete
      await Promise.allSettled(stationPromises);

      const totalDuration = new Date().getTime() - startTimestamp.getTime();

      // Determine overall status
      let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
      if (successfulStations === 0) {
        status = 'DOWN';
      } else if (successfulStations < totalStations || errors.length > 0) {
        status = 'DEGRADED';
      }

      const healthData = await this.healthCacheService.createHealthData({
        sourceId: key,
        name: 'GFH API',
        sourceUrl: 'https://globalfloods.eu',
        status,
        responseTimeMs: totalDuration,
        errors: errors.length > 0 ? errors : null,
      });

      await this.healthCacheService.setSourceHealth(key, healthData);
      this.logger.log(
        `GFH API health data updated - ${successfulStations}/${totalStations} stations successful`,
      );
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Error in GFH main execution: ${errorMessage}`);

      const healthData = await this.healthCacheService.createHealthData({
        sourceId: key,
        name: 'GFH API',
        sourceUrl: 'https://globalfloods.eu',
        status: 'DOWN',
        responseTimeMs: new Date().getTime() - startTimestamp.getTime(),
        errors: [
          {
            code: 'GFH_SYNC_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      await this.healthCacheService.setSourceHealth(key, healthData);
    }
  }

  async fetchRainfallStation(
    seriesId: number,
  ): Promise<RainfallStationItem | null> {
    try {
      const {
        data: { data },
      } = (await this.httpService.axiosRef.get(rainfallStationUrl, {
        httpsAgent: httpsAgent,
      })) as { data: { data: RainfallStationItem[][] } };

      const targettedData = data[0].find((item) => item.series_id == seriesId);

      if (!targettedData) {
        this.logger.warn(`No rainfall station found for series ID ${seriesId}`);
        return null;
      }

      return targettedData;
    } catch (error) {
      this.logger.warn('Error fetching rainfall station:', error);
      throw error;
    }
  }

  async fetchRiverStation(seriesId: number): Promise<RiverStationItem | null> {
    try {
      const {
        data: { data: riverStation },
      } = (await this.httpService.axiosRef.get(riverStationUrl, {
        httpsAgent: httpsAgent,
      })) as { data: { data: RiverStationItem[] } };

      const targettedData = riverStation.find(
        (item) => item.series_id === seriesId,
      );

      if (!targettedData) {
        this.logger.warn(`No river station found for series ID ${seriesId}`);
        return null;
      }

      return targettedData;
    } catch (error) {
      this.logger.warn('Error fetching river station:', error);
      return null;
    }
  }

  // run every hour
  @Cron('0 * * * *')
  async synchronizeGlofas() {
    const key = `GLOFAS`;
    const startTimestamp = new Date();
    const errors = [];
    let successfulStations = 0;
    let totalStations = 0;

    try {
      this.logger.log('GLOFAS: syncing Glofas data');
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const glofasSettings = dataSource[DataSource.GLOFAS];

      if (!glofasSettings) {
        this.logger.warn('GLOFAS settings not found');

        const healthData = await this.healthCacheService.createHealthData({
          sourceId: key,
          name: 'Glofas API',
          sourceUrl: 'https://www.globalfloods.eu',
          status: 'DOWN',
          responseTimeMs: new Date().getTime() - startTimestamp.getTime(),
          errors: [
            {
              code: 'GLOFAS_CONFIG_ERROR',
              message: 'GLOFAS settings not found',
              timestamp: new Date().toISOString(),
            },
          ],
        });

        await this.healthCacheService.setSourceHealth(key, healthData);
        return;
      }

      const stationPromises = [];
      totalStations = glofasSettings.length;

      for (const glofasStation of glofasSettings) {
        const stationPromise = (async () => {
          const stationStartTime = new Date();
          try {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const { dateString, dateTimeString } =
              getFormattedDate(yesterdayDate);

            const riverBasin = glofasStation['LOCATION'];

            const hasExistingRecord =
              await this.glofasService.findGlofasDataByDate(
                riverBasin,
                dateString,
              );
            if (hasExistingRecord) {
              this.logger.log(
                `GLOFAS: Data for ${riverBasin} on ${dateString} already exists.`,
              );
              successfulStations++;
              return stationStartTime;
            }

            this.logger.log(
              `GLOFAS: Fetching data for ${riverBasin} on ${dateString}`,
            );
            const stationData = await this.glofasService.getStationData({
              ...glofasStation,
              TIMESTRING: dateTimeString,
            });

            const reportingPoints =
              stationData?.content['Reporting Points'].point;

            const glofasData = parseGlofasData(reportingPoints);
            this.logger.log(
              `GLOFAS: Parsed data for ${riverBasin} on ${dateString}`,
            );
            const res = await this.sourceService.create({
              source: 'GLOFAS',
              riverBasin: riverBasin,
              type: SourceType.RAINFALL,
              info: { ...glofasData, forecastDate: dateString },
            });

            if (res) {
              this.logger.log(
                `GLOFAS: Data saved successfully for ${riverBasin} on ${dateString}`,
              );
              successfulStations++;
            } else {
              this.logger.warn(
                `GLOFAS: Failed to save data for ${riverBasin} on ${dateString}`,
              );
              errors.push({
                code: 'GLOFAS_SAVE_ERROR',
                message: `Failed to save data for ${riverBasin} on ${dateString}`,
                timestamp: new Date().toISOString(),
              });
            }

            return stationStartTime;
          } catch (stationError) {
            const errorMessage = stationError?.message || 'Unknown error';
            errors.push({
              code: 'GLOFAS_STATION_ERROR',
              message: `Error processing station ${glofasStation.LOCATION}: ${errorMessage}`,
              timestamp: new Date().toISOString(),
            });
            this.logger.error(
              `GLOFAS: Error processing station ${glofasStation.LOCATION}:`,
              errorMessage,
            );
            return stationStartTime;
          }
        })();

        stationPromises.push(stationPromise);
      }

      // Wait for all stations to complete
      await Promise.allSettled(stationPromises);

      const totalDuration = new Date().getTime() - startTimestamp.getTime();

      // Determine overall status
      let status: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
      if (successfulStations === 0) {
        status = 'DOWN';
      } else if (successfulStations < totalStations || errors.length > 0) {
        status = 'DEGRADED';
      }

      const healthData = await this.healthCacheService.createHealthData({
        sourceId: key,
        name: 'Glofas API',
        sourceUrl: 'https://www.globalfloods.eu',
        status,
        responseTimeMs: totalDuration,
        errors: errors.length > 0 ? errors : null,
      });

      await this.healthCacheService.setSourceHealth(key, healthData);
      this.logger.log(
        `GLOFAS API health data updated - ${successfulStations}/${totalStations} stations successful`,
      );
    } catch (err) {
      const errorMessage = err?.message || 'Unknown error';
      this.logger.error('GLOFAS Err:', errorMessage);

      const healthData = await this.healthCacheService.createHealthData({
        sourceId: key,
        name: 'Glofas API',
        sourceUrl: 'https://www.globalfloods.eu',
        status: 'DOWN',
        responseTimeMs: new Date().getTime() - startTimestamp.getTime(),
        errors: [
          {
            code: 'GLOFAS_SYNC_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      await this.healthCacheService.setSourceHealth(key, healthData);
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
        fetch_interval_minutes: 15, // Every 15 minutes
        stale_threshold_multiplier: 1.5, // STALE after 22.5 minutes, EXPIRED after that
      },
    ];

    for (const config of sourceConfigs) {
      await this.healthCacheService.setSourceConfig(config);
    }
  }
}
