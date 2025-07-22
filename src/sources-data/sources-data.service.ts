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
  InputItem,
  RainfallStationData,
  RainfallStationItem,
  RiverStationData,
  RiverStationItem,
  RiverWaterHistoryItem,
  SourceDataTypeEnum,
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
import { DhmService } from './dhm.service';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
@Injectable()
export class SourcesDataService {
  logger = new Logger(SourcesDataService.name);
  constructor(
    private prisma: PrismaService,
    private readonly dhmService: DhmService,
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
          dataSource: source,
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
      throw new RpcException(
        `Failed to fetch water levels: '${error.message}'`,
      );
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
    seriesId: number[];
    location: string;
    from: Date;
    to: Date;
    dataType: string;
  }) {
    const { seriesId, location, from, to, dataType } = payload;

    const results: RainfallStationData[] = [];

    for (const id of seriesId) {
      try {
        const rainfallQueryParams = buildQueryParams(id, new Date(from), to);
        const stationData = await this.fetchRainfallStation(id);

        if (!stationData || !rainfallQueryParams) {
          this.logger.warn(
            `Missing station data or query params for ${location}`,
          );
          return;
        }

        const data = await this.dhmService.getDhmRainfallWatchData({
          date: rainfallQueryParams.date_from,
          period: SourceDataTypeEnum[dataType],
          seriesid: id.toString(),
          location: location,
        });

        const normalizedData =
          await this.dhmService.normalizeDhmRiverAndRainfallWatchData(
            data as InputItem[],
          );

        results.push({
          ...stationData,
          history: normalizedData,
        });
      } catch (Error) {
        this.logger.error(`Error for ${location}: ${Error.message}`, Error);
      }
    }

    return results;
  }

  async fetchRiverLevelData(payload: {
    seriesId: number[];
    location: string;
    from: Date;
    to: Date;
    dataType: string;
  }) {
    const { seriesId, location, from, to, dataType } = payload;

    const results: RiverStationData[] = [];

    for (const id of seriesId) {
      try {
        const riverWatchQueryParam = buildQueryParams(id, new Date(from), to);
        const stationData = await this.fetchRiverStation(id);

        if (!stationData || !riverWatchQueryParam) {
          this.logger.warn(
            `Missing station data or query params for ${location}`,
          );
          return;
        }

        const data = await this.dhmService.getDhmRiverWatchData({
          date: riverWatchQueryParam.date_from,
          period: SourceDataTypeEnum[dataType],
          seriesid: id.toString(),
          location: location,
        });

        const normalizedData =
          await this.dhmService.normalizeDhmRiverAndRainfallWatchData(
            data as InputItem[],
          );

        results.push({
          ...stationData,
          history: normalizedData,
        });
      } catch (Error) {
        this.logger.error(
          `Database error for ${location}: ${Error.message}`,
          Error,
        );
      }
    }
    return results;
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

  isDateWithinLast14Days(date: Date): boolean {
    if (!(date instanceof Date) || isNaN(date.getTime())) return false;

    const today = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    return date >= fourteenDaysAgo && date <= today;
  }

  isToday(from: Date, to: Date) {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    return from >= startOfToday && to <= endOfToday;
  }

  async getLevels(payload: GetSouceDataDto, type: SourceType) {
    const { riverBasin, from, to, type: dataType, source } = payload;

    if (!riverBasin) {
      this.logger.warn('River basin is not passed in the payload');
      throw new RpcException('River basin is required');
    }

    if (source !== DataSource.DHM) {
      return this.getGlofasWaterLevels(payload);
    }

    if (!type) {
      this.logger.warn('Type is not passed in the payload');
      throw new RpcException('Type is required');
    }

    const isToday = this.isToday(new Date(from), new Date(to));

    const sourcesData = await this.prisma.sourcesData.findMany({
      where: {
        type,
        dataSource: source,
        source: { riverBasin },
      },
      include: {
        source: {
          select: { riverBasin: true, source: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!sourcesData.length) {
      this.logger.error(
        `No sourcesData found for river basin: ${riverBasin}, type: ${type}, dataSource: ${source}`,
      );
      throw new RpcException(
        `No sourcesData found for river basin: ${riverBasin}, type: ${type}, dataSource: ${source}`,
      );
    }

    const infos = sourcesData?.map((item) => item.info);

    const dataInfos = { ...sourcesData[0], info: infos };

    const isRealTime =
      (type === SourceType.WATER_LEVEL &&
        dataType === SourceDataType.Point &&
        isToday) ||
      (type === SourceType.RAINFALL &&
        dataType === SourceDataType.Hourly &&
        isToday);

    if (isRealTime) {
      return dataInfos;
    }

    if (
      !this.isDateWithinLast14Days(new Date(from)) ||
      !this.isDateWithinLast14Days(new Date(to))
    ) {
      this.logger.error('Dates must be within the last 14 days');
      throw new RpcException('Dates must be within the last 14 days');
    }

    const dhmSettings = (
      SettingsService.get('DATASOURCE') as DataSourceValue
    )?.[DataSource.DHM];
    const item = dhmSettings?.find(
      (i) => i?.WATER_LEVEL?.LOCATION === riverBasin,
    );

    if (!item) {
      this.logger.warn(
        `No DHM data config found for river basin: ${riverBasin}`,
      );
      return null;
    }

    const fetchPayload = {
      seriesId:
        type === SourceType.WATER_LEVEL
          ? item.WATER_LEVEL.SERIESID
          : item.RAINFALL.SERIESID,
      location:
        type === SourceType.WATER_LEVEL
          ? item.WATER_LEVEL.LOCATION
          : item.RAINFALL.LOCATION,
      from: from || new Date(),
      to: to || new Date(),
      dataType,
    };

    const response =
      type === SourceType.WATER_LEVEL
        ? await this.fetchRiverLevelData(fetchPayload)
        : await this.fetchRainfallLevelData(fetchPayload);

    if (!response) {
      this.logger.warn('Live data fetch failed');
    }

    return {
      ...dataInfos,
      info: response,
    };
  }

  async getGlofasWaterLevels(payload: GetSouceDataDto) {
    let { riverBasin } = payload;

    // DHM uses Doda for Dhoda where as Glofas uses Dhoda
    riverBasin = riverBasin.replace('Dhoda', 'Doda');

    const date = getFormattedDate();

    const data = await this.findGlofasData(riverBasin, date.dateString);

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
          riverBasin,
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
