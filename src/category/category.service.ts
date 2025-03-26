import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from 'src/common/dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { ListCategoryDto } from './dto';

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

  findAll(payload: ListCategoryDto) {
    const { appId, order, sort, name, page, perPage } = payload;

    const query = {
      where: {
        app: appId,
        isDeleted: false,
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
      },
      orderBy: {
        // [sort]: order,
      },
    };

    return paginate(this.prisma.activityCategory, query, {
      page,
      perPage,
    });
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

  async remove(payload: { uuid: string }) {
    return await this.prisma.activityCategory.update({
      where: {
        uuid: payload.uuid,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
