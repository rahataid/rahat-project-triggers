import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { paginator, PaginatorTypes } from '@lib/database';
import { ListCategoryDto } from './dto';
import { PrismaService } from '@lib/database';

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

  async findAll(payload: ListCategoryDto) {
    const { appId, name, page, perPage } = payload;

    const query = {
      where: {
        app: appId,
        isDeleted: false,
        ...(name && {
          name: {
            contains: name,
            mode: 'insensitive' as const,
          },
        }),
      },
      orderBy: {
        // [sort]: order,
      },
    };

    if (page !== undefined && perPage !== undefined) {
      return paginate(this.prisma.activityCategory, query, {
        page,
        perPage,
      });
    }

    const data = await this.prisma.activityCategory.findMany(query);

    return {
      data,
      meta: {
        total: data.length,
        lastPage: 1,
        currentPage: 1,
        perPage: data.length,
        prev: null,
        next: null,
      },
    };
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
