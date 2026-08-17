import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoryDto } from './dto';
import { PrismaService } from '@lib/database';

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
    const { appId, name } = payload;

    const query = {
      where: {
        app: appId,
        isDeleted: false,
        ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      },
      orderBy: {
        // [sort]: order,
      },
    };

    return this.prisma.activityCategory.findMany(query);
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
