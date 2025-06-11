import { Injectable, Logger } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
// import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
import { RpcException } from '@nestjs/microservices';
import { GetSouceDataDto, SourceDataType } from './dto/get-source-data';
import { DataSource, SourceType } from '@prisma/client';
import {
  RainfallStationData,
  RainfallStationItem,
  RiverStationData,
  RiverStationItem,
  RiverWaterHistoryItem,
} from 'src/types/data-source';
import {
  hydrologyObservationUrl,
  rainfallStationUrl,
  riverStationUrl,
} from 'src/constant/datasourceUrls';
import * as https from 'https';
import { buildQueryParams, getFormattedDate } from 'src/common';
import { SettingsService } from '@rumsan/settings';
import { DataSourceValue } from 'src/types/settings';
import { GlofasService } from './glofas.service';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
@Injectable()
export class SourcesDataService {
  logger = new Logger(SourcesDataService.name);
  dhmService: any;
  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}
  async create(dto: CreateSourcesDataDto) {
    const { info, source, riverBasin, type } = dto;
    this.logger.log(
      `Creating new sourcedata with source: ${source} river_basin: ${riverBasin}`,
    );
    try {
      return this.prisma.sourcesData.create({
        data: {
          info,
          type,
          source: {
            connectOrCreate: {
              where: {
                riverBasin: riverBasin,
              },
              create: {
                riverBasin,
                source: [source],
              },
            },
          },
        },
        include: {
          source: true,
        },
      });
    } catch (error) {
      this.logger.error('Error while creatiing new source data', error);
      throw new RpcException(error);
    }
  }

  findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    const { order, sort, page, perPage } = dto;
    orderBy[sort] = order;
    this.logger.log(`Fetching sourceData`);
    try {
      return paginate(
        this.prisma.sourcesData,
        {
          orderBy,
        },
        {
          page: page,
          perPage: perPage,
        },
      );
    } catch (error) {
      this.logger.error('Error while fetching source data', error);
      throw new RpcException(error);
    }
  }

  findOne(id: number) {
    try {
      this.logger.log(`Fetching sourceData with uuid: ${id}`);
      return this.prisma.sourcesData.findUnique({
        where: {
          id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error while fetching source data with id: ${id}`,
        error,
      );
      throw new RpcException(error);
    }
  }

  update(dto: UpdateSourcesDataDto) {
    const { id, info, source, riverBasin } = dto;
    this.logger.log(
      `Updating  existing sourcedata info with source: ${source} river_basin: ${riverBasin}`,
    );
    try {
      return this.prisma.sourcesData.update({
        where: {
          id,
        },
        data: {
          info: info,
          source: {
            connect: {
              riverBasin: riverBasin,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error while updating source data info', error);
      throw new RpcException(error);
    }
  }

  async getSourceFromAppId(appId: string) {
    const dataSource = await this.prisma.source.findFirst({
      where: {
        Phase: {
          some: {
            Activity: {
              some: {
                app: appId,
              },
            },
          },
        },
      },
    });

    return dataSource;
  }

  async getWaterLevels(payload: GetSouceDataDto) {
    this.logger.log('Fetching water levels');
    try {
      return await this.getLevels(payload, SourceType.WATER_LEVEL);
    } catch (error) {
      this.logger.error(`Error while getting water levels: ${error}`);
      throw new RpcException('Failed to fetch water levels');
    }
  }

  async getRainfallLevels(payload: GetSouceDataDto) {
    this.logger.log('Fetching rainfall data');
    try {
      return await this.getLevels(payload, SourceType.RAINFALL);
    } catch (error) {
      this.logger.error(`Error while getting rainfall data: ${error}`);
      throw new RpcException('Failed to fetch rainfall data');
    }
  }

  async fetchRainfallLevelData(payload: {
    seriesId: number;
    location: string;
    from: Date;
    to: Date;
  }) {
    const { seriesId, location, from, to } = payload;
    try {
      const rainfallQueryParams = buildQueryParams(seriesId, from, to);
      const stationData = await this.fetchRainfallStation(seriesId);

      if (!stationData || !rainfallQueryParams) {
        this.logger.warn(
          `Missing station data or query params for ${location}`,
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

      return rainfallData;
    } catch (Error) {
      this.logger.error(`Error for ${location}: ${Error.message}`, Error);
    }
  }

  async fetchRiverLevelData(payload: {
    seriesId: number;
    location: string;
    from: Date;
    to: Date;
  }) {
    const { seriesId, location, from, to } = payload;
    try {
      const riverWatchQueryParam = buildQueryParams(seriesId, from, to);
      const stationData = await this.fetchRiverStation(seriesId);

      if (!stationData || !riverWatchQueryParam) {
        this.logger.warn(
          `Missing station data or query params for ${location}`,
        );
        return;
      }

      const {
        data: { data },
      } = (await this.httpService.axiosRef.get(hydrologyObservationUrl, {
        params: riverWatchQueryParam,
      })) as { data: { data: RiverWaterHistoryItem[] } };

      if (!data || data.length === 0) {
        this.logger.warn(`No history data returned for ${location}`);
        return;
      }

      const waterLevelData: RiverStationData = {
        ...stationData,
        history: data,
      };

      return waterLevelData;
    } catch (Error) {
      this.logger.error(
        `Database error for ${location}: ${Error.message}`,
        Error,
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

  isToday(from: Date, to: Date) {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    return from >= startOfToday && to <= endOfToday;
  }

  async getLevels(payload: GetSouceDataDto, type: SourceType) {
    const { riverBasin, from, to, type: dataType } = payload;

    if (payload.source !== DataSource.DHM) {
      if (!riverBasin) {
        this.logger.warn('River basin is not passed in the payload');
        throw new RpcException('River basin is required');
      }
      return this.getGlofasWaterLevels(payload);
    }

    if (!type) {
      this.logger.warn('Type is not passed in the payload');
      throw new RpcException('Type is required');
    }

    const isToday = await this.isToday(new Date(from), new Date(to));

    let response;

    const dataInfo = await this.prisma.sourcesData.findFirst({
      where: {
        type,
        source: {
          riverBasin,
        },
      },
      include: {
        source: {
          select: {
            riverBasin: true,
            source: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!isToday || !dataInfo) {
      const dataSource = SettingsService.get('DATASOURCE') as DataSourceValue;
      const dhmSettings = dataSource[DataSource.DHM];

      const item = dhmSettings.find((item) => {
        return item.WATER_LEVEL.LOCATION === riverBasin;
      });

      if (type === 'WATER_LEVEL') {
        response = await this.fetchRiverLevelData({
          seriesId: item.WATER_LEVEL.SERIESID,
          location: item.WATER_LEVEL.LOCATION,
          from: from || new Date(),
          to: to || new Date(),
        });
      } else {
        response = await this.fetchRainfallLevelData({
          seriesId: item.RAINFALL.SERIESID,
          location: item.RAINFALL.LOCATION,
          from: from || new Date(),
          to: to || new Date(),
        });
      }
    }

    const aggregatedInfo = await this.processDataByType(
      dataType,
      response ?? dataInfo.info,
    );
    return {
      ...dataInfo,
      info: aggregatedInfo,
    };
  }

  async getGlofasWaterLevels(payload: GetSouceDataDto) {
    let { riverBasin } = payload;

    // DHM uses Doda for Dhoda where as Glofas uses Dhoda
    riverBasin = riverBasin.replace('Dhoda', 'Doda');

    const date = getFormattedDate();

    const data = await this.findGlofasData(
      riverBasin,
      date.dateString,
    );

    return data;
  }

  aggregateDataByTime(history: any[]) {
    const hourlyData: Record<
      string,
      {
        values: number[];
        min: number;
        max: number;
        total: number;
        count: number;
      }
    > = {};
    const dailyData: Record<
      string,
      {
        values: number[];
        min: number;
        max: number;
        total: number;
        count: number;
      }
    > = {};

    history.forEach(({ datetime, value }) => {
      const date = datetime.split('T')[0];
      const hour = datetime.split('T')[1].split(':')[0];

      // Aggregate hourly data
      const hourKey = `${date}T${hour}:00:00`;
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          values: [],
          min: Infinity,
          max: -Infinity,
          total: 0,
          count: 0,
        };
      }
      hourlyData[hourKey].values.push(value);
      hourlyData[hourKey].min = Math.min(hourlyData[hourKey].min, value);
      hourlyData[hourKey].max = Math.max(hourlyData[hourKey].max, value);
      hourlyData[hourKey].total += value;
      hourlyData[hourKey].count += 1;

      // Aggregate daily data
      const newDate = `${date}T00:00:00`;
      if (!dailyData[newDate]) {
        dailyData[newDate] = {
          values: [],
          min: Infinity,
          max: -Infinity,
          total: 0,
          count: 0,
        };
      }
      dailyData[newDate].values.push(value);
      dailyData[newDate].min = Math.min(dailyData[newDate].min, value);
      dailyData[newDate].max = Math.max(dailyData[newDate].max, value);
      dailyData[newDate].total += value;
      dailyData[newDate].count += 1;
    });

    // Convert aggregated data to arrays
    const hourlyArray = Object.entries(hourlyData).map(([datetime, data]) => ({
      datetime,
      value:
        data.count > 0 ? parseFloat((data.total / data.count).toFixed(3)) : 0,
      min: data.min !== Infinity ? parseFloat(data.min.toFixed(3)) : 0,
      max: data.max !== -Infinity ? parseFloat(data.max.toFixed(3)) : 0,
    }));

    const dailyArray = Object.entries(dailyData).map(([datetime, data]) => ({
      datetime,
      value:
        data.count > 0 ? parseFloat((data.total / data.count).toFixed(3)) : 0,
      min: data.min !== Infinity ? parseFloat(data.min.toFixed(3)) : 0,
      max: data.max !== -Infinity ? parseFloat(data.max.toFixed(3)) : 0,
    }));

    return { hourly: hourlyArray, daily: dailyArray };
  }

  async processDataByType(type: SourceDataType, data: RiverStationData) {
    switch (type) {
      case SourceDataType.Point:
        return data;
      case SourceDataType.Hourly:
        const { hourly } = this.aggregateDataByTime(data.history);
        return {
          ...data,
          history: hourly,
        };
      case SourceDataType.Daily:
        const { daily } = this.aggregateDataByTime(data.history);
        return {
          ...data,
          history: daily,
        };
      default:
        return data;
    }
  }

  async findGlofasData(riverBasin: string, forecastDate: string) {
    const recordExists = await this.prisma.sourcesData.findFirst({
      where: {
        source: {
          riverBasin: {
            contains: riverBasin,
          },
        },
        info: {
          path: ['forecastDate'],
          equals: forecastDate,
        },
      },
    });
    return recordExists;
  }
}
