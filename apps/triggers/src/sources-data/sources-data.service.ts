import { Injectable, Logger } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import {
  paginator,
  PaginatorTypes,
  PrismaService,
  DataSource,
  SourceType,
} from '@lib/database';
import { PaginationDto } from 'src/common/dto';
import { HttpService } from '@nestjs/axios';
import { RpcException } from '@nestjs/microservices';
import {
  GetAllGlofasProbFloodDto,
  GetOneGlofasProbFloodDto,
  GetSouceDataDto,
  GetTemperatureSourceDataDto,
  SourceDataType,
} from './dto/get-source-data';
import * as https from 'https';
import { getFormattedDate } from 'src/common';
import { GetSeriesDto } from './dto/get-series';
import { DhmService as DHM } from '@lib/dhm-adapter';
import { GlofasServices } from '@lib/glofas-adapter';
import { GfhService } from '@lib/gfh-adapter';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import {
  GetDhmSingleSeriesDto,
  GetDhmSingleSeriesTemperatureDto,
} from './dto/get-dhm-single-series.dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
@Injectable()
export class SourcesDataService {
  logger = new Logger(SourcesDataService.name);
  constructor(
    private prisma: PrismaService,
    private readonly dhm: DHM,
    private readonly glofasServices: GlofasServices,
    private readonly gfhServices: GfhService,
    private readonly scheduleSourcesDataService: ScheduleSourcesDataService,
  ) {}

  async create(dto: CreateSourcesDataDto) {
    const { info, source, riverBasin, type } = dto;
    this.logger.log(
      `Creating new sourcedata with source: ${source} river_basin: ${riverBasin}`,
    );
    try {
      return await this.prisma.sourcesData.create({
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
    } catch (error: any) {
      this.logger.error('Error while creatiing new source data', error);
      throw new RpcException(error);
    }
  }

  async findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    const { order, sort, page, perPage } = dto;
    orderBy[sort] = order;
    this.logger.log(`Fetching sourceData`);
    try {
      return await paginate(
        this.prisma.sourcesData,
        {
          orderBy,
        },
        {
          page: page,
          perPage: perPage,
        },
      );
    } catch (error: any) {
      this.logger.error('Error while fetching source data', error);
      throw new RpcException(error);
    }
  }

  async findSeriesByDataSource(payload: GetSeriesDto) {
    try {
      const {
        dataSource,
        type,
        riverBasin,
        stationName,
        levelType = null,
      } = payload;

      switch (dataSource) {
        case DataSource.DHM: {
          const dhm = await this.dhm.getSourceData(type, riverBasin, levelType);
          return dhm;
        }
        case DataSource.GLOFAS: {
          const glofas = await this.glofasServices.getSourceData(
            type || SourceType.WATER_LEVEL,
            riverBasin,
          );
          return glofas;
        }

        case DataSource.GFH: {
          const gfh = await this.gfhServices.getSourceData(
            type || SourceType.WATER_LEVEL,
            riverBasin,
            stationName,
          );
          return gfh;
        }
        default:
          return [];
      }
    } catch (error: any) {
      this.logger.error('Error while fetching source data', error);
      throw new RpcException(error);
    }
  }

  async findOne(id: number) {
    try {
      this.logger.log(`Fetching sourceData with uuid: ${id}`);
      return await this.prisma.sourcesData.findUnique({
        where: {
          id,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error while fetching source data with id: ${id}`,
        error,
      );
      throw new RpcException(error);
    }
  }

  async update(dto: UpdateSourcesDataDto) {
    const { id, info, source, riverBasin } = dto;
    this.logger.log(
      `Updating  existing sourcedata info with source: ${source} river_basin: ${riverBasin}`,
    );
    try {
      return await this.prisma.sourcesData.update({
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
    } catch (error: any) {
      this.logger.error('Error while updating source data info', error);
      throw new RpcException(error);
    }
  }

  async getWaterLevels(payload: GetSouceDataDto) {
    this.logger.log('Fetching water levels');
    try {
      return await this.getLevels(payload, SourceType.WATER_LEVEL);
    } catch (error: any) {
      this.logger.error(`Error while getting water levels: ${error}`);
      throw new RpcException(
        `Failed to fetch water levels: '${error.message}'`,
      );
    }
  }

  async getTemperatureDhmLevels(payload: GetTemperatureSourceDataDto) {
    this.logger.log('Fetching temperature data');
    try {
      return await this.getTemperatureLevels(payload, SourceType.TEMPERATURE);
    } catch (error: any) {
      this.logger.error(`Error while getting temperature data: ${error}`);
      throw new RpcException(
        `Failed to fetch temperature data: '${error.message}'`,
      );
    }
  }

  async getRainfallLevels(payload: GetSouceDataDto) {
    this.logger.log('Fetching rainfall data');
    try {
      return await this.getLevels(payload, SourceType.RAINFALL);
    } catch (error: any) {
      this.logger.error(`Error while getting rainfall data: ${error}`);
      throw new RpcException('Failed to fetch rainfall data');
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

  async getLevels(payload: GetSouceDataDto, type: SourceType) {
    const { riverBasin, source } = payload;

    if (!riverBasin) {
      this.logger.warn('River basin is not passed in the payload');
      throw new RpcException('River basin is required');
    }

    if (source === DataSource.GFH) {
      return this.getGfhWaterLevels(payload);
    }

    if (source !== DataSource.DHM) {
      return;
    }

    if (!type) {
      this.logger.warn('Type is not passed in the payload');
      throw new RpcException('Type is required');
    }

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

    return dataInfos;
  }

  async getTemperatureLevels(
    payload: GetTemperatureSourceDataDto,
    type: SourceType,
  ) {
    const { riverBasin, source, parameter } = payload;

    if (!riverBasin) {
      this.logger.warn('River basin is not passed in the payload');
      throw new RpcException('River basin is required');
    }

    if (source !== DataSource.DHM) {
      throw new RpcException(
        'Temperature data is only available for DHM source',
      );
    }

    const temperatureSourcesData = await this.prisma.sourcesData.findMany({
      where: {
        type,
        dataSource: source,
        source: { riverBasin },
        ...(parameter && {
          info: {
            path: ['parameter_code'],
            equals: parameter,
          },
        }),
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

    if (!temperatureSourcesData.length) {
      this.logger.error(
        `No temperatureSourcesData found for river basin: ${riverBasin}, type: ${type}, dataSource: ${source}`,
      );
      throw new RpcException(
        `No temperatureSourcesData found for river basin: ${riverBasin}, type: ${type}, dataSource: ${source}`,
      );
    }

    const infos = temperatureSourcesData?.map((item) => item.info);

    const dataInfos = { ...temperatureSourcesData[0], info: infos };

    return dataInfos;
  }

  private getGlofasForecastDate() {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const date = getFormattedDate(yesterdayDate);
    return date.dateString;
  }

  async getAllGlofasProbFlood(payload: GetAllGlofasProbFloodDto) {
    this.logger.log('Fetching all Glofas Prob Flood data');

    const { riverBasin } = payload;

    const forecastDate = this.getGlofasForecastDate();

    const records = await this.prisma.sourcesData.findMany({
      where: {
        type: SourceType.PROB_FLOOD,
        dataSource: DataSource.GLOFAS,
        source: {
          riverBasin,
        },
        info: {
          path: ['forecastDate'],
          equals: forecastDate,
        },
      },
      include: {
        source: { select: { riverBasin: true } },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return records;
  }

  async getOneGlofasProbFlood(payload: GetOneGlofasProbFloodDto) {
    const { riverBasin, returnPeriod } = payload;

    this.logger.log(
      `Fetching Glofas Prob Flood data; return period ${returnPeriod}`,
    );

    const forecastDate = this.getGlofasForecastDate();

    const record = await this.prisma.sourcesData.findFirst({
      where: {
        type: SourceType.PROB_FLOOD,
        dataSource: DataSource.GLOFAS,
        source: {
          riverBasin,
        },
        AND: [
          {
            info: {
              path: ['forecastDate'],
              equals: forecastDate,
            },
          },
          {
            info: {
              path: ['returnPeriod'],
              equals: returnPeriod,
            },
          },
        ],
      },
      include: {
        source: { select: { riverBasin: true } },
      },
    });

    return record;
  }

  async getGfhWaterLevels(payload: GetSouceDataDto) {
    const { riverBasin } = payload;

    const date = getFormattedDate();
    return await this.findGfhData(riverBasin, date.dateString);
  }

  async findGfhData(
    riverBasin: string,
    forecastDate: string,
    stationName?: string,
  ) {
    const recordExists = await this.prisma.sourcesData.findMany({
      where: {
        source: {
          riverBasin,
        },
        dataSource: DataSource.GFH,
        AND: [
          {
            OR: [
              {
                info: {
                  path: ['info', 'forecastDate'],
                  equals: forecastDate,
                },
              },
              {
                info: {
                  path: ['forecastDate'],
                  equals: forecastDate,
                },
              },
            ],
          },
          ...(stationName
            ? [
                {
                  info: {
                    path: ['stationName'],
                    equals: stationName,
                  },
                },
              ]
            : []),
        ],
      },
    });

    return recordExists;
  }

  isToday(from: Date, to: Date) {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    return from >= startOfToday && to <= endOfToday;
  }

  async getOneDhmSeriesWaterLevels(payload: GetDhmSingleSeriesDto) {
    const { from, to, period, seriesId, riverBasin } = payload;
    const isToday = this.isToday(new Date(from), new Date(to));
    if (isToday && period === SourceDataType.Point) {
      return await this.prisma.sourcesData.findFirst({
        where: {
          type: SourceType.WATER_LEVEL,
          dataSource: DataSource.DHM,
          source: { riverBasin },
        },
        include: {
          source: {
            select: { riverBasin: true, source: true },
          },
        },
      });
    }

    if (
      !this.isDateWithinLast14Days(new Date(from)) ||
      !this.isDateWithinLast14Days(new Date(to))
    ) {
      this.logger.error('Dates must be within the last 14 days');
      throw new RpcException('Dates must be within the last 14 days');
    }
    const result = await this.scheduleSourcesDataService.getDhmWaterLevels(
      from,
      period,
      seriesId,
    );

    return { info: result };
  }

  async getOneDhmSeriesTemperature(payload: GetDhmSingleSeriesTemperatureDto) {
    const { seriesId, riverBasin } = payload;

    const record = await this.prisma.sourcesData.findFirst({
      where: {
        type: SourceType.TEMPERATURE,
        dataSource: DataSource.DHM,
        source: { riverBasin },
        info: {
          path: ['series_id'],
          equals: seriesId,
        },
      },
      include: {
        source: {
          select: { riverBasin: true, source: true },
        },
      },
    });

    if (!record) {
      this.logger.error(
        `No temperature data found for riverBasin: ${riverBasin}, seriesId: ${seriesId}`,
      );
      throw new RpcException(
        `No temperature data found for riverBasin: ${riverBasin}, seriesId: ${seriesId}`,
      );
    }

    return record;
  }
}
