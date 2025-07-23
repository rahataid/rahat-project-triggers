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
  rainfallStationUrl,
  riverStationUrl,
} from 'src/constant/datasourceUrls';
import * as https from 'https';
import {
  RiverStationItem,
  RiverStationData,
  RainfallStationItem,
  RainfallStationData,
  SourceDataTypeEnum,
  InputItem,
} from 'src/types/data-source';
import { DataSource, SourceType } from '@prisma/client';
import { DataSourceValue } from 'src/types/settings';
import { GfhService } from './gfh.service';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
@Injectable()
export class ScheduleSourcesDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  constructor(
    private readonly sourceService: SourcesDataService,
    private readonly dhmService: DhmService,
    private readonly glofasService: GlofasService,
    private readonly httpService: HttpService,
    private readonly gfhService: GfhService,
  ) {}
  onApplicationBootstrap() {
    this.syncRiverWaterData();
    this.syncRainfallData();
    this.synchronizeGlofas();
    this.syncGlobalFloodHub();
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRiverWaterData() {
    this.logger.log('Syncing river water data');
    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];
      dhmSettings.forEach(async ({ WATER_LEVEL: { LOCATION, SERIESID } }) => {
        const riverWatchQueryParam = buildQueryParams(SERIESID);
        const stationData = await this.fetchRiverStation(SERIESID);
        if (!stationData || !riverWatchQueryParam) {
          this.logger.warn(
            `Missing station data or query params for ${LOCATION}`,
          );
          return;
        }
        try {
          const data = await this.dhmService.getDhmRiverWatchData({
            date: riverWatchQueryParam.date_from,
            period: SourceDataTypeEnum.POINT.toString(),
            seriesid: SERIESID.toString(),
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
            this.logger.warn(`Failed to save water level data for ${LOCATION}`);
          }
        } catch (dbError) {
          // If history data fetch fails, save only the station data
          if (stationData) {
            await this.dhmService.saveDataInDhm(
              SourceType.WATER_LEVEL,
              LOCATION,
              {
                ...stationData,
              },
            );
          }
          this.logger.error(
            `Error while fetching river watch history data ${LOCATION}: '${dbError?.response?.data?.message || dbError.message}'`,
          );
        }
      });
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

      dhmSettings.forEach(async ({ RAINFALL: { LOCATION, SERIESID } }) => {
        try {
          const rainfallQueryParams = buildQueryParams(SERIESID);
          const stationData = await this.fetchRainfallStation(SERIESID);

          if (!stationData || !rainfallQueryParams) {
            this.logger.warn(
              `Missing station data or query params for ${LOCATION}`,
            );
            return;
          }

          const data = await this.dhmService.getDhmRainfallWatchData({
            date: rainfallQueryParams.date_from,
            period: SourceDataTypeEnum.HOURLY.toString(),
            seriesid: SERIESID.toString(),
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
            this.logger.log(`Rainfall data saved successfully for ${LOCATION}`);
          } else {
            this.logger.warn(
              `Failed to Rainfall water level data for ${LOCATION}`,
            );
          }
        } catch (dbError) {
          this.logger.error(
            `Error while fetching rainfall history data for ${LOCATION}: '${dbError?.response?.data?.message || dbError.message}'`,
          );
        }
      });
    } catch (error) {
      this.logger.error(
        'Error fetching rainfall data:',
        error?.response?.data?.message || error.message,
      );
    }
  }

  //run every 24 hours
  @Cron('0 0 * * *')
  async syncGlobalFloodHub() {
    this.logger.log('Starting flood data fetching process...');
    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const gfhSettings = dataSource[DataSource.GFH];

      // Step 1 : Check if GFH settings are available
      if (!gfhSettings || gfhSettings.length === 0) {
        this.logger.warn('GFH settings not found or empty');
        return;
      }

      // Step 2: Fetch all gauges
      const gauges = await this.gfhService.fetchAllGauges();
      if (gauges.length === 0) {
        throw new Error('No gauges found');
      }

      gfhSettings.forEach(async (gfhStationDetails) => {
        const { dateString } = getFormattedDate();
        const stationName = gfhStationDetails.STATION_NAME;
        // Step 3: Check data are already fetched
        const hasExistingRecord = await this.sourceService.findGfhData(
          stationName,
          dateString,
        );
        if (hasExistingRecord) {
          this.logger.log(
            `Global flood data for ${stationName} on ${dateString} already exists.`,
          );
          return;
        }

        // Step 4: Match stations to gauges
        const [stationGaugeMapping, uniqueGaugeIds] =
          this.gfhService.matchStationToGauge(gauges, gfhStationDetails);

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
          throw new Error('No station data found');
        }

        // Step 8: Format the data
        const gfhData = this.gfhService.formateGfhStationData(
          dateString,
          stationData,
          stationName,
        );

        // Step 9: Save the data in Global Flood Hub
        const res = await this.gfhService.saveDataInGfh(
          SourceType.WATER_LEVEL,
          stationName,
          gfhData,
        );
        if (res) {
          this.logger.log(
            `Global flood data saved successfully for ${stationName}`,
          );
        } else {
          this.logger.warn(`Failed to Global flood data for ${stationName}`);
        }
      });
    } catch (error) {
      Logger.error(`Error in main execution: ${error}`);
      throw error;
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
