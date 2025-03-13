import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}
  create(dto: CreateDailyMonitoringDto) {
    const { appId, ...rest } = dto;

    return this.prisma.dailyMonitoring.create({
      data: {
        ...rest,
        app: appId,
      },
    });
  }

  findAll(payload: ListDailyMonitoringDto) {
    const { page, perPage, dataEntryBy, location, createdAt, appId } = payload;

    const query = {
      where: {
        isDeleted: false,
        app: appId,
        ...(dataEntryBy && {
          dataEntryBy: { contains: dataEntryBy, mode: 'insensitive' },
        }),
        ...(location && {
          location: { contains: location, mode: 'insensitive' },
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
  }

  async findOne(payload: { uuid: string }) {
    const { uuid } = payload;
    return this.prisma.dailyMonitoring.findUnique({
      where: {
        uuid: uuid,
        isDeleted: false,
      },
    });
  }

  async update(payload: UpdateDailyMonitoringDto) {
    const { uuid, dataEntryBy, location, info } = payload;
    const existing = await this.prisma.dailyMonitoring.findUnique({
      where: {
        uuid: uuid,
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
        location: location || existingData.location,
        info: JSON.parse(JSON.stringify(info)) || existingData,
        updatedAt: new Date(),
      },
    });

    return updatedMonitoringData;
  }

  async remove(payload: { uuid: string }) {
    const { uuid } = payload;
    return await this.prisma.dailyMonitoring.update({
      where: {
        uuid: uuid,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
