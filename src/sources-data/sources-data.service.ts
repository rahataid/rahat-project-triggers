import { Injectable, Logger } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
// import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
import { RpcException } from '@nestjs/microservices';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
@Injectable()
export class SourcesDataService {
  logger = new Logger(SourcesDataService.name);
  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}
  async create(dto: CreateSourcesDataDto) {
    const { info, source, riverBasin } = dto;
    this.logger.log(
      `Creating new sourcedata with source: ${source} river_basin: ${riverBasin}`,
    );
    try {
      return this.prisma.sourcesData.create({
        data: {
          info: info,

          source: {
            connectOrCreate: {
              where: {
                source_riverBasin: {
                  source: source,
                  riverBasin,
                },
              },
              create: {
                source: source,
                riverBasin,
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
              source_riverBasin: {
                source: source,
                riverBasin: riverBasin,
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error while updating source data info', error);
      throw new RpcException(error);
    }
  }
}
