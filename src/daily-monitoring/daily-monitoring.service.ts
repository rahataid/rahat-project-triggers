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
      const { source, riverBasin, ...rest } = dto;

      return await this.prisma.dailyMonitoring.create({
        data: {
          ...rest,
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
      const { page, perPage, dataEntryBy, riverBasin, createdAt } = payload;

      const query = {
        where: {
          isDeleted: false,
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
      const result = await this.prisma.dailyMonitoring.findFirst({
        where: {
          groupKey: uuid,
          isDeleted: false,
        },
        include: {
          source: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const latest = result.id;
      const manyData = await this.prisma.dailyMonitoring.findMany({
        where: {
          id: {
            gte: latest - 2,
            lte: latest,
          },
          sourceId: result.sourceId,
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
    // TODO: fix this
    const existing = await this.prisma.dailyMonitoring.findFirst({
      where: {
        groupKey: uuid,
      },
      include: {
        source: true,
      },
    });

    if (!existing) throw new RpcException('Monitoring Data not found!');

    const existingData = JSON.parse(JSON.stringify(existing));

    // TODO: fix this
    const updatedMonitoringData = await this.prisma.dailyMonitoring.update({
      where: {
        id: existingData.id,
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
      // TODO: fix this
      const { uuid } = payload;
      return await this.prisma.dailyMonitoring.updateMany({
        where: {
          groupKey: uuid,
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
