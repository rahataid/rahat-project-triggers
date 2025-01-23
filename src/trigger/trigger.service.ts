import { Injectable } from '@nestjs/common';
import { CreateTriggerDto, UpdateTriggerDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class TriggerService {
  constructor(private readonly prisma: PrismaService) {}
  create(appId: string, dto: CreateTriggerDto) {
    return this.prisma.trigger.create({
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
      this.prisma.trigger,
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
    return this.prisma.trigger.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateTriggerDto) {
    return this.prisma.trigger.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
