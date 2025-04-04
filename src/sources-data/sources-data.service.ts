import { Injectable, Logger } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
// import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
import { RpcException } from '@nestjs/microservices';
import { GetSouceDataDto } from './dto/get-source-data';
import { SourceType } from '@prisma/client';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
@Injectable()
export class SourcesDataService {
  logger = new Logger(SourcesDataService.name);
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

  async getLevels(payload: GetSouceDataDto, type: SourceType) {
    const { page, perPage, appId } = payload;

    return paginate(
      this.prisma.sourcesData,
      {
        where: {
          type,
          source: {
            riverBasin: payload.riverBasin,
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
      },
      {
        page,
        perPage,
      },
    );
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
}
