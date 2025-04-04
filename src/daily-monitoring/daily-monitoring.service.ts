import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import {
  CreateDailyMonitoringDto,
  ListDailyMonitoringDto,
  UpdateDailyMonitoringDto,
} from './dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class DailyMonitoringService {
  logger = new Logger(DailyMonitoringService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDailyMonitoringDto) {
    this.logger.log('Creating daily monitoring data');
    try {
      const { appId, source, riverBasin, ...rest } = dto;

      return await this.prisma.dailyMonitoring.create({
        data: {
          ...rest,
          app: appId,
          source: {
            connectOrCreate: {
              where: {
                riverBasin: riverBasin,
                source: {
                  hasSome: [source],
                },
                // source_riverBasin: {
                //   // source: source,
                //   riverBasin: riverBasin,
                // },
              },
              create: {
                riverBasin: riverBasin,
                source: [source],
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to create daily monitoring data');
    }
  }

  findAll(payload: ListDailyMonitoringDto) {
    this.logger.log('Fetching all daily monitoring data');

    try {
      const { page, perPage, dataEntryBy, riverBasin, createdAt, appId } =
        payload;

      const query = {
        where: {
          isDeleted: false,
          app: appId,
          ...(dataEntryBy && {
            dataEntryBy: { contains: dataEntryBy, mode: 'insensitive' },
          }),
          ...(riverBasin && {
            source: {
              riverBasin: {
                contains: riverBasin,
                mode: 'insensitive',
              },
            },
          }),
          ...(createdAt && {
            createdAt: {
              gte: createdAt,
            },
          }),
        },
      };

      return paginate(this.prisma.dailyMonitoring, query, {
        page,
        perPage,
      });
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to fetch daily monitoring data');
    }
  }

  async findOne(payload: { uuid: string }) {
    this.logger.log(
      `Fetching daily monitoring data with uuid: ${payload.uuid}`,
    );
    try {
      const { uuid } = payload;
      const result = await this.prisma.dailyMonitoring.findUnique({
        where: {
          uuid: uuid,
          isDeleted: false,
        },
        include: {
          source: true,
        },
      });

      const latest = result.id;
      const manyData = await this.prisma.dailyMonitoring.findMany({
        where: {
          id: {
            gte: latest - 2,
            lte: latest,
          },
          source: {
            riverBasin: result.source.riverBasin,
          },
          isDeleted: false,
        },
      });

      const { info: monitoringData, ...rest } = result;

      return {
        singleData: {
          ...rest,
          monitoringData,
        },
        multipleData: manyData,
      };
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to fetch daily monitoring data');
    }
  }

  async update(payload: UpdateDailyMonitoringDto) {
    const { uuid, dataEntryBy, riverBasin, info } = payload;
    const existing = await this.prisma.dailyMonitoring.findUnique({
      where: {
        uuid: uuid,
      },
      include: {
        source: true,
      },
    });

    if (!existing) throw new RpcException('Monitoring Data not found!');

    const existingData = JSON.parse(JSON.stringify(existing));

    const updatedMonitoringData = await this.prisma.dailyMonitoring.update({
      where: {
        uuid: uuid,
      },
      data: {
        dataEntryBy: dataEntryBy || existingData.dataEntryBy,
        // Will update location if riverBasin and source is provided else will keep the existing location
        ...(riverBasin && {
          source: {
            connectOrCreate: {
              where: {
                riverBasin: riverBasin,
              },
              create: {
                riverBasin: riverBasin,
              },
            },
          },
        }),
        info: JSON.parse(JSON.stringify(info)) || existingData,
        updatedAt: new Date(),
      },
    });
    return updatedMonitoringData;
  }

  async remove(payload: { uuid: string }) {
    this.logger.log(
      `Deleting daily monitoring data with uuid: ${payload.uuid}`,
    );
    try {
      const { uuid } = payload;
      return await this.prisma.dailyMonitoring.update({
        where: {
          uuid: uuid,
        },
        data: {
          isDeleted: true,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to delete daily monitoring data');
    }
  }
}
