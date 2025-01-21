import { Injectable } from '@nestjs/common';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { Phases } from '@prisma/client';
import { PaginationDto } from 'src/common/dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class PhasesService {
  constructor(private prisma: PrismaService) {}

  create(appId: string, dto: CreatePhaseDto) {
    return this.prisma.phase.create({
      data: {
        ...dto,
        name: dto.name as Phases,
        app: appId,
      },
    });
  }

  findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[dto.sort] = dto.order;
    return paginate(
      this.prisma.phase,
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
    return this.prisma.phase.findUnique({
      where: { uuid },
    });
  }

  update(uuid: string, dto: UpdatePhaseDto) {
    return this.prisma.phase.update({
      where: { uuid },
      data: {
        ...dto,
        name: dto.name as Phases,
      },
    });
  }
}
