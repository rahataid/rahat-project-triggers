import { Injectable } from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
@Injectable()
export class MonitorService {
  constructor(private prisma: PrismaService) {}
  create(appId: string, dto: CreateMonitorDto) {
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

  update(uuid: string, dto: UpdateMonitorDto) {
    return this.prisma.dailyMonitoring.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
