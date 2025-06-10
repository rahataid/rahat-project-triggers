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
} from 'src/types/data-source';
import { DataSource, SourceType } from '@prisma/client';
import { DataSourceValue } from 'src/types/settings';

// const DATASOURCE = {
//   DHM: {
//     URL: 'https://bipadportal.gov.np/api/v1',
//     LOCATION: 'Karnali at Chisapani',
//   },
//   GLOFAS: {
//     I: '721',
//     J: '303',
//     URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
//     BBOX: '8753364.64714296,3117815.425733483,9092541.220653716,3456991.999244238',
//     LOCATION: 'Karnali at Chisapani',
//   },
// };

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

  /*
   * @deprecated
   * This method is deprecated and will be removed in future versions.
   */
  // @Cron('*/5 * * * *') // every 5 min
  async synchronizeDHM() {
    try {
      this.logger.log('DHM: syncing every hour');

      const dhmSettings = SettingsService.get('DATASOURCE.DHM');

      const riverBasin = dhmSettings['LOCATION'];
      const dhmURL = dhmSettings['URL'];
      const waterLevelResponse = await this.dhmService.getRiverStationData(
        dhmURL,
        riverBasin,
      );

      const waterLevelData = this.dhmService.sortByDate(
        waterLevelResponse.data.results as any[],
      );

      if (waterLevelData.length === 0) {
        this.logger.log(
          `DHM:${riverBasin}: Water level data is not available.`,
        );
        return;
      }

      const recentWaterLevel = waterLevelData[0];
      // return this.dhmService.saveWaterLevelsData(riverBasin, recentWaterLevel);
    } catch (err) {
      this.logger.error('DHM Err:', err.message);
    }
  }

  @Cron('*/15 * * * *')
  async syncRiverWaterData() {
    this.logger.log('Syncing river water data');
    try {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];
      dhmSettings.forEach(async ({ WATER_LEVEL: { LOCATION, SERIESID } }) => {
        try {
          const riverWatchQueryParam = buildQueryParams(SERIESID);
          const stationData = await this.fetchRiverStation(SERIESID);

          if (!stationData || !riverWatchQueryParam) {
            this.logger.warn(
              `Missing station data or query params for ${LOCATION}`,
            );
            return;
          }

          const {
            data: { data },
          } = (await this.httpService.axiosRef.get(hydrologyObservationUrl, {
            params: riverWatchQueryParam,
          })) as { data: { data: RiverWaterHistoryItem[] } };

          if (!data || data.length === 0) {
            this.logger.warn(`No history data returned for ${LOCATION}`);
            return;
          }

          const waterLevelData: RiverStationData = {
            ...stationData,
            history: data,
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
          this.logger.error(
            `Database error for ${LOCATION}: ${dbError.message}`,
            dbError,
          );
        }
      });
    } catch (error) {
      this.logger.error('Error in syncRiverWaterData:', error.message);
    }
  }

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

          const rainfallHistory = await this.httpService.axiosRef.get(
            hydrologyObservationUrl,
            {
              params: rainfallQueryParams,
            },
          );

          const rainfallData: RainfallStationData = {
            ...stationData,
            history: rainfallHistory.data.data,
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
            `Database error for ${LOCATION}: ${dbError.message}`,
            dbError,
          );
        }
      });
    } catch (error) {
      this.logger.warn('Error fetching rainfall data:', error.message);
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

  // run every 15 sec
  @Cron('15 * * * *')
  async synchronizeGlofas() {
    try {
      this.logger.log('GLOFAS: syncing once every hour');
      // const glofasSettings = DATASOURCE.GLOFAS;
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const glofasSettings = dataSource[DataSource.GLOFAS][0];

      const { dateString, dateTimeString } = getFormattedDate();
//       const glofasSettings = SettingsService.get('DATASOURCE.GLOFAS') as Omit<
//  'TIMESTRING'
//       >;
      const riverBasin = glofasSettings['LOCATION'];

      const hasExistingRecord = await this.glofasService.findGlofasDataByDate(
        riverBasin,
        dateString,
      );

      if (hasExistingRecord) {
        console.log('existingRecord');
        return;
      }

      const stationData = await this.glofasService.getStationData({
        ...glofasSettings,
        TIMESTRING: dateTimeString,
      });

      const reportingPoints = stationData?.content['Reporting Points'].point;

      const glofasData = parseGlofasData(reportingPoints);

      return this.sourceService.create({
        source: 'GLOFAS',
        riverBasin: riverBasin,
        type: SourceType.RAINFALL,
        info: { ...glofasData, forecastDate: dateString },
      });
    } catch (err) {
      this.logger.error('GLOFAS Err:', err.message);
    }
  }
}
