import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import {
  AddDailyMonitoringDto,
  CreateDailyMonitoringDto,
  ListDailyMonitoringDto,
  UpdateDailyMonitoringDto,
} from './dto';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class DailyMonitoringService {
  logger = new Logger(DailyMonitoringService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: AddDailyMonitoringDto) {
    this.logger.log('Creating daily monitoring data');
    try {
      const { riverBasin, uuid, user, ...rest } = dto;
      const groupKey = uuid || randomUUID();

      const source = await this.prisma.source.findUnique({
        where: { riverBasin },
      });

      if (!source) throw new NotFoundException('Source not found');

      return Promise.all(
        rest.data?.map((entry) =>
          this.prisma.dailyMonitoring.create({
            data: {
              groupKey,
              sourceId: source.id,
              dataEntryBy: user?.name,
              dataSource: entry.source,
              info: entry,
            },
          }),
        ),
      );
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to create daily monitoring data');
    }
  }

  async findAll(payload: ListDailyMonitoringDto) {
    this.logger.log('Fetching all daily monitoring data');

    try {
      const { page, perPage, dataEntryBy, riverBasin, createdAt } = payload;

      const query = {
        where: {
          isDeleted: false,
          ...(dataEntryBy && {
            dataEntryBy: {
              contains: dataEntryBy,
              mode: Prisma.QueryMode.insensitive,
            },
          }),
          ...(riverBasin && {
            source: {
              riverBasin: {
                contains: riverBasin,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          }),
          ...(createdAt && {
            createdAt: {
              gte: createdAt,
            },
          }),
        },
        include: {
          source: {
            select: {
              riverBasin: true,
            },
          },
        },
      };

      const [results, total] = await Promise.all([
        this.prisma.dailyMonitoring.findMany({
          where: query.where,
          include: query.include,
        }),
        this.prisma.dailyMonitoring.count({
          where: query.where,
        }),
      ]);
      console.log(results);
      const transformedData = this.sameGroupeKeyMergeData(results);
      return { results: transformedData, total };
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
      const result = await this.prisma.dailyMonitoring.findMany({
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

      return this.sameGroupeKeyMergeData(result);

      // console.log(latest);
      // const manyData = await this.prisma.dailyMonitoring.findMany({
      //   where: {
      //     id: {
      //       gte: 7 - 2,
      //       lte: 7,
      //     },
      //     sourceId: result.sourceId,
      //     isDeleted: false,
      //   },
      // });

      // const { info: monitoringData, ...rest } = result;

      // return {
      //   singleData: {
      //     ...rest,
      //     monitoringData,
      //   },

      //   multipleData: manyData,
      // };
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to fetch daily monitoring data');
    }
  }

  async update(payload: UpdateDailyMonitoringDto) {
    const { uuid, riverBasin, data, user: dataEntryBy } = payload;
    this.logger.log(`Updating daily monitoring data with groupkey: ${uuid}`);

    try {
      const sourceRef = await this.prisma.source.findUnique({
        where: { riverBasin },
      });

      const results = await Promise.all(
        data.map(async (entry) => {
          const { id, source, ...infoUpdates } = entry;

          const commonData = {
            groupKey: uuid,
            info: {
              ...infoUpdates,
              ...(source && { source }),
            },
            dataSource: source,
            sourceId: sourceRef?.id,
          };

          if (id) {
            const existingRecord = await this.prisma.dailyMonitoring.findFirst({
              where: { id, groupKey: uuid },
            });

            if (existingRecord) {
              const updated = await this.prisma.dailyMonitoring.update({
                where: { id },
                data: {
                  ...commonData,
                  updatedAt: new Date(),
                },
              });
              return updated;
            }
          }

          const created = await this.prisma.dailyMonitoring.create({
            data: {
              ...commonData,
              dataEntryBy: dataEntryBy?.name,
            },
          });

          return created;
        }),
      );

      return results;
    } catch (error) {
      console.error('Error in upsert operation:', error);
      throw error;
    }
  }

  async remove(payload: { uuid: string }) {
    this.logger.log(
      `Deleting daily monitoring data with uuid: ${payload.uuid}`,
    );
    try {
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

  async deleteDailyMonitoringByIdAndGroupKey(payload: {
    uuid: string;
    id: number;
  }) {
    try {
      const { uuid, id } = payload;
      return await this.prisma.dailyMonitoring.update({
        where: {
          groupKey: uuid,
          id,
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
  sameGroupeKeyMergeData(response) {
    const grouped = {};
    response?.forEach((item) => {
      const { groupKey } = item;
      const infoWithId = {
        ...item.info,
        id: item.id,
      };

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupKey,
          dataEntryBy: item.dataEntryBy,
          riverBasin: item?.source?.riverBasin,
          data: [infoWithId],
          createdBy: item.createdBy,
          isDeleted: item.isDeleted,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      } else {
        grouped[groupKey].data.push(infoWithId);
      }
    });

    return Object.values(grouped);
  }
}
