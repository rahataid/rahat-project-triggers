import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from 'src/common/dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  create(appId: string, dto: CreateCategoryDto) {
    return this.prisma.activityCategory.create({
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
      this.prisma.activityCategory,
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
    return this.prisma.activityCategory.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateCategoryDto) {
    return this.prisma.activityCategory.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }
}
