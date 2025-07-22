import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { Cron } from '@nestjs/schedule';
import { SettingsService } from '@rumsan/settings';
import {
  buildQueryParams,
  getFormattedDate,
  parseGlofasData,
} from 'src/common';
import { GlofasStationInfo } from './dto';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { HttpService } from '@nestjs/axios';
import {
  hydrologyObservationUrl,
  rainfallStationUrl,
  riverStationUrl,
} from 'src/constant/datasourceUrls';
import * as https from 'https';
import {
  RiverStationItem,
  RiverWaterHistoryItem,
  RiverStationData,
  RainfallStationItem,
  RainfallStationData,
  SourceDataTypeEnum,
  InputItem,
} from 'src/types/data-source';
import { DataSource, SourceType } from '@prisma/client';
import { DataSourceValue } from 'src/types/settings';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
@Injectable()
export class ScheduleSourcesDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  constructor(
    private readonly sourceService: SourcesDataService,
    private readonly dhmService: DhmService,
    private readonly glofasService: GlofasService,
    private readonly httpService: HttpService,
  ) {}
  onApplicationBootstrap() {
    this.syncRiverWaterData();
    this.syncRainfallData();
    this.synchronizeGlofas();
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRiverWaterData() {
    this.logger.log('Syncing river water data');
    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      for (const {
        WATER_LEVEL: { LOCATION, SERIESID },
      } of dhmSettings) {
        for (const seriesId of SERIESID) {
          const riverWatchQueryParam = buildQueryParams(seriesId);
          const stationData = await this.fetchRiverStation(seriesId);

          if (!stationData || !riverWatchQueryParam) {
            this.logger.warn(
              `Missing station data or query params for ${LOCATION}`,
            );
            continue;
          }

          try {
            const data = await this.dhmService.getDhmRiverWatchData({
              date: riverWatchQueryParam.date_from,
              period: SourceDataTypeEnum.POINT.toString(),
              seriesid: seriesId.toString(),
              location: LOCATION,
            });

            const normalizedData =
              await this.dhmService.normalizeDhmRiverAndRainfallWatchData(
                data as InputItem[],
              );

            const waterLevelData: RiverStationData = {
              ...stationData,
              history: normalizedData,
            };

            const res = await this.dhmService.saveDataInDhm(
              SourceType.WATER_LEVEL,
              LOCATION,
              waterLevelData,
            );

            if (res) {
              this.logger.log(
                `Water level data saved successfully for ${LOCATION}`,
              );
            } else {
              this.logger.warn(
                `Failed to save water level data for ${LOCATION}`,
              );
            }
          } catch (dbError) {
            // If history data fetch fails, save only the station data
            await this.dhmService.saveDataInDhm(
              SourceType.WATER_LEVEL,
              LOCATION,
              {
                ...stationData,
              },
            );

            this.logger.error(
              `Error while fetching river watch history data ${LOCATION}: '${dbError?.response?.data?.message || dbError.message}'`,
            );
          }
        }
      }
    } catch (error) {
      console.log('error', error);
      this.logger.error(
        'Error in syncRiverWaterData:',
        error?.response?.data?.message || error.message,
      );
    }
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRainfallData() {
    this.logger.log('Syncing rainfall data');
    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      for (const {
        RAINFALL: { LOCATION, SERIESID },
      } of dhmSettings) {
        for (const seriesId of SERIESID) {
          try {
            const rainfallQueryParams = buildQueryParams(seriesId);
            const stationData = await this.fetchRainfallStation(seriesId);

            if (!stationData || !rainfallQueryParams) {
              this.logger.warn(
                `Missing station data or query params for ${LOCATION}`,
              );
              continue;
            }

            const data = await this.dhmService.getDhmRainfallWatchData({
              date: rainfallQueryParams.date_from,
              period: SourceDataTypeEnum.HOURLY.toString(),
              seriesid: seriesId.toString(),
              location: LOCATION,
            });

            const normalizedData =
              await this.dhmService.normalizeDhmRiverAndRainfallWatchData(
                data as InputItem[],
              );

            const rainfallData: RainfallStationData = {
              ...stationData,
              history: normalizedData,
            };

            const res = await this.dhmService.saveDataInDhm(
              SourceType.RAINFALL,
              LOCATION,
              rainfallData,
            );

            if (res) {
              this.logger.log(
                `Rainfall data saved successfully for ${LOCATION}`,
              );
            } else {
              this.logger.warn(`Failed to save rainfall data for ${LOCATION}`);
            }
          } catch (dbError) {
            this.logger.error(
              `Error while fetching rainfall history data for ${LOCATION}: '${dbError?.response?.data?.message || dbError.message}'`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        'Error fetching rainfall data:',
        error?.response?.data?.message || error.message,
      );
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
      throw error;
    }
  }

  // run every hour
  @Cron('0 * * * *')
  async synchronizeGlofas() {
    try {
      this.logger.log('GLOFAS: syncing Glofas data');
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const glofasSettings = dataSource[DataSource.GLOFAS];

      if (!glofasSettings) {
        this.logger.warn('GLOFAS settings not found');
        return;
      }
      glofasSettings.forEach(async (glofasStation: GlofasStationInfo) => {
        const { dateString, dateTimeString } = getFormattedDate();

        const riverBasin = glofasStation['LOCATION'];

        const hasExistingRecord = await this.glofasService.findGlofasDataByDate(
          riverBasin,
          dateString,
        );
        if (hasExistingRecord) {
          this.logger.log(
            `GLOFAS: Data for ${riverBasin} on ${dateString} already exists.`,
          );
          return;
        }

        this.logger.log(
          `GLOFAS: Fetching data for ${riverBasin} on ${dateString}`,
        );
        const stationData = await this.glofasService.getStationData({
          ...glofasStation,
          TIMESTRING: dateTimeString,
        });

        const reportingPoints = stationData?.content['Reporting Points'].point;

        const glofasData = parseGlofasData(reportingPoints);
        this.logger.log(
          `GLOFAS: Parsed data for ${riverBasin} on ${dateString}`,
        );
        return this.sourceService.create({
          source: 'GLOFAS',
          riverBasin: riverBasin,
          type: SourceType.RAINFALL,
          info: { ...glofasData, forecastDate: dateString },
        });
      });
    } catch (err) {
      this.logger.error('GLOFAS Err:', err.message);
    }
  }
}
