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
import { GaugeForecastDto } from './dto/list-gaugeForecast.dto';
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

      const [results] = await Promise.all([
        this.prisma.dailyMonitoring.findMany({
          where: query.where,
          include: query.include,
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);
      const transformedData = this.sameGroupeKeyMergeData(results);
      return { results: transformedData };
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

  async getGaugeReading() {
    this.logger.log('Fetching all gauge reading data');
    try {
      const gaugeReadingData = await this.prisma.dailyMonitoring.findMany({
        where: {
          dataSource: 'Gauge Reading',
          isDeleted: false,
        },
        include: {
          source: {
            select: {
              riverBasin: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      const groupedData =
        this.groupGaugeReadingsByDateAndStation(gaugeReadingData);
      return groupedData;
    } catch (error) {
      this.logger.error('Error fetching gauge reading data:', error);
      throw new RpcException('Failed to fetch gauge reading data');
    }
  }

  private groupGaugeReadingsByDateAndStation(data: any[]) {
    const grouped = new Map<string, any>();
    data.forEach((item) => {
      const { sourceId, dateKey, station, gaugeReading, gaugeForecast } =
        this.extractGaugeReadingInfo(item);
      const groupKey = `${sourceId}_${station}_${dateKey}_${gaugeForecast}`;

      if (!grouped.has(groupKey)) {
        grouped.set(
          groupKey,
          this.createNewGaugeReadingGroup(
            item,
            sourceId,
            dateKey,
            station,
            gaugeReading,
            gaugeForecast,
          ),
        );
      }
    });

    return Array.from(grouped.values());
  }

  private extractGaugeReadingInfo(item: any) {
    const createdDate = new Date(item.createdAt);
    const dateKey = createdDate.toISOString().split('T')[0];
    const sourceId = item.sourceId;
    const station = item.info?.station || '';
    const gaugeForecast = item.info?.gaugeForecast || '';
    const gaugeReading = parseFloat(item.info?.gaugeReading) || 0;
    return { sourceId, dateKey, station, gaugeReading, gaugeForecast };
  }

  private createNewGaugeReadingGroup(
    item: any,
    sourceId: number,
    dateKey: string,
    station: string,
    gaugeReading: number,
    gaugeForecast: string,
  ) {
    return {
      sourceId: sourceId,
      date: dateKey,
      station: station,
      dataEntryBy: item.dataEntryBy,
      riverBasin: item.source?.riverBasin,
      gaugeForecast,
      latestGaugeReading: gaugeReading,
      createdBy: item.createdBy,
      isDeleted: item.isDeleted,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async getGaugeForecast(payload: GaugeForecastDto) {
    this.logger.log(
      `Fetching gauge reading data by date: ${JSON.stringify(payload)}`,
    );

    try {
      const whereConditions: any = {
        dataSource: 'Gauge Reading',
        isDeleted: false,
        AND: [],
      };

      // Add sourceId filter if provided
      if (payload?.sourceId) {
        whereConditions.sourceId = Number(payload.sourceId);
      }

      // Add station filter if provided
      if (payload?.station) {
        whereConditions.AND.push({
          info: {
            path: ['station'],
            equals: payload?.station,
          },
        });
      }

      // Add gaugeForecast filter if provided
      if (payload?.gaugeForecast) {
        whereConditions.AND.push({
          info: {
            path: ['gaugeForecast'],
            equals: payload?.gaugeForecast,
          },
        });
      }

      // Add date filter if provided
      if (payload.date) {
        const startDate = new Date(payload.date);
        const endDate = new Date(payload.date);
        endDate.setDate(endDate.getDate() + 1);

        whereConditions.createdAt = {
          gte: startDate,
          lt: endDate,
        };
      }

      // Remove AND array if it's empty to avoid Prisma issues
      if (whereConditions.AND.length === 0) {
        delete whereConditions.AND;
      }

      const rawData = await this.prisma.dailyMonitoring.findMany({
        where: whereConditions,
        include: {
          source: {
            select: { riverBasin: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return rawData.map((item) => {
        const info = item?.info as Record<string, any>;
        const gaugeReading =
          typeof info === 'object' && info?.gaugeReading
            ? info.gaugeReading
            : '0';

        return {
          value: gaugeReading,
          datetime: item?.createdAt,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching gauge forecast data:', error.message);
      throw new RpcException('Failed to fetch gauge forecast data');
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
