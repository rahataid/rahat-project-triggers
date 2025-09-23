import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SourceType } from '@prisma/client';
import { buildQueryParams } from 'src/common';
import {
  rainfallStationUrl,
  riverStationUrl,
} from 'src/constant/datasourceUrls';
import { SourceDataTypeEnum } from 'src/types/data-source';
import type {
  RiverStationData,
  RainfallStationData,
  InputItem,
  RiverStationItem,
  RainfallStationItem,
} from 'src/types/data-source';
import { DhmService } from '../dhm.service';
import { HealthError } from './health-utils.service';
import * as https from 'https';

export interface DhmStationConfig {
  LOCATION: string;
  SERIESID: number[];
}

export interface WaterLevelStationConfig {
  WATER_LEVEL: DhmStationConfig;
}

export interface RainfallStationConfig {
  RAINFALL: DhmStationConfig;
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

@Injectable()
export class DhmStationProcessorService {
  private readonly logger = new Logger(DhmStationProcessorService.name);

  constructor(
    private readonly dhmService: DhmService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Process a single water level station
   */
  async processWaterLevelStation(
    config: WaterLevelStationConfig,
    seriesId: number,
    errors: HealthError[],
  ): Promise<boolean> {
    const { LOCATION } = config.WATER_LEVEL;

    try {
      const riverWatchQueryParam = buildQueryParams(seriesId);
      const stationData = await this.fetchRiverStation(seriesId);

      if (!stationData || !riverWatchQueryParam) {
        this.logger.warn(
          `Missing station data or query params for ${LOCATION}`,
        );
        errors.push({
          code: 'DHM_WATER_MISSING_DATA',
          message: `Missing station data or query params for ${LOCATION}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

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

      const result = await this.dhmService.saveDataInDhm(
        SourceType.WATER_LEVEL,
        LOCATION,
        waterLevelData,
      );

      if (result) {
        this.logger.log(`Water level data saved successfully for ${LOCATION}`);
        return true;
      } else {
        this.logger.warn(`Failed to save water level data for ${LOCATION}`);
        errors.push({
          code: 'DHM_WATER_SAVE_ERROR',
          message: `Failed to save water level data for ${LOCATION}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
    } catch (dbError) {
      const errorMessage = dbError?.response?.data?.message || dbError.message;
      errors.push({
        code: 'DHM_WATER_FETCH_ERROR',
        message: `Error fetching water level data for ${LOCATION}: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });

      // Fallback: try to save station data only
      try {
        const stationData = await this.fetchRiverStation(seriesId);
        if (stationData) {
          await this.dhmService.saveDataInDhm(
            SourceType.WATER_LEVEL,
            LOCATION,
            { ...stationData },
          );
          this.logger.log(`Saved fallback data for ${LOCATION}`);
          return true;
        }
      } catch (saveError) {
        this.logger.error(
          `Failed to save fallback data for ${LOCATION}:`,
          saveError.message,
        );
      }

      this.logger.error(
        `Error while fetching river watch history data ${LOCATION}: '${errorMessage}'`,
      );
      return false;
    }
  }

  /**
   * Process a single rainfall station
   */
  async processRainfallStation(
    config: RainfallStationConfig,
    seriesId: number,
    errors: HealthError[],
  ): Promise<boolean> {
    const { LOCATION } = config.RAINFALL;

    try {
      const rainfallQueryParams = buildQueryParams(seriesId);
      const stationData = await this.fetchRainfallStation(seriesId);

      if (!stationData || !rainfallQueryParams) {
        this.logger.warn(
          `Missing station data or query params for ${LOCATION}`,
        );
        errors.push({
          code: 'DHM_RAINFALL_MISSING_DATA',
          message: `Missing station data or query params for ${LOCATION}`,
          timestamp: new Date().toISOString(),
        });
        return false;
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

      const result = await this.dhmService.saveDataInDhm(
        SourceType.RAINFALL,
        LOCATION,
        rainfallData,
      );

      if (result) {
        this.logger.log(`Rainfall data saved successfully for ${LOCATION}`);
        return true;
      } else {
        this.logger.warn(`Failed to save rainfall data for ${LOCATION}`);
        errors.push({
          code: 'DHM_RAINFALL_SAVE_ERROR',
          message: `Failed to save rainfall data for ${LOCATION}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
    } catch (dbError) {
      const errorMessage = dbError?.response?.data?.message || dbError.message;
      errors.push({
        code: 'DHM_RAINFALL_FETCH_ERROR',
        message: `Error fetching rainfall data for ${LOCATION}: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(
        `Error while fetching rainfall history data for ${LOCATION}: '${errorMessage}'`,
      );
      return false;
    }
  }

  /**
   * Create station processing tasks for water level
   */
  createWaterLevelTasks(
    dhmSettings: WaterLevelStationConfig[],
  ): Array<{ config: WaterLevelStationConfig; seriesId: number }> {
    const tasks = [];
    for (const config of dhmSettings) {
      for (const seriesId of config.WATER_LEVEL.SERIESID) {
        tasks.push({ config, seriesId });
      }
    }
    return tasks;
  }

  /**
   * Create station processing tasks for rainfall
   */
  createRainfallTasks(
    dhmSettings: RainfallStationConfig[],
  ): Array<{ config: RainfallStationConfig; seriesId: number }> {
    const tasks = [];
    for (const config of dhmSettings) {
      for (const seriesId of config.RAINFALL.SERIESID) {
        tasks.push({ config, seriesId });
      }
    }
    return tasks;
  }

  /**
   * Fetch rainfall station data by series ID
   */
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

  /**
   * Fetch river station data by series ID
   */
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
}
