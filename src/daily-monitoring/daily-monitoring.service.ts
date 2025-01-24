import { Injectable } from '@nestjs/common';
import { CreateDailyMonitoringDto, UpdateDailyMonitoringDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class DailyMonitoringService {
  constructor(private prisma: PrismaService) {}
  create(appId: string, dto: CreateDailyMonitoringDto) {
    return this.prisma.dailyMonitoring.create({
      data: {
        ...dto,
        app: appId,
      },
    });
  }

  findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[dto.sort] = dto.order;
    return paginate(
      this.prisma.dailyMonitoring,
      {
        where: {
          app: appId,
        },
        orderBy,
      },
      {
        page: dto.page,
        perPage: dto.perPage,
      },
    );
  }

  findOne(uuid: string) {
    return this.prisma.dailyMonitoring.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateDailyMonitoringDto) {
    return this.prisma.dailyMonitoring.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
