import { Injectable } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class SourcesDataService {
  constructor(private prisma: PrismaService) {}
  create(appId: string, dto: CreateSourcesDataDto) {
    return this.prisma.sourcesData.create({
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
      this.prisma.sourcesData,
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
    return this.prisma.sourcesData.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateSourcesDataDto) {
    return this.prisma.sourcesData.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
