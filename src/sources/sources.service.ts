import { Injectable } from '@nestjs/common';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}
  create(appId: string, dto: CreateSourceDto) {
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

  update(uuid: string, dto: UpdateSourceDto) {
    return this.prisma.sourcesData.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
