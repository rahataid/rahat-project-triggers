import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { GetSouceDto } from './dto/get-source.dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class SourceService {
  logger = new Logger(SourceService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(dto: GetSouceDto) {
    try {
      this.logger.log('Fetching all sources');
      const paginatedData = await paginate(
        this.prisma.source,
        {
          where: {},
          include: {
            Phase: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        {
          page: dto.page,
          perPage: dto.perPage,
        },
      );
      return paginatedData;
    } catch (error) {
      this.logger.error(`Error fetching sources: ${error}`, error);
      throw new RpcException(error);
    }
  }

  async findOne(dto: { uuid: string }) {
    try {
      this.logger.log(`Fetching source with UUID: ${dto.uuid}`);
      const source = await this.prisma.source.findUnique({
        where: { uuid: dto.uuid },
        include: {
          Phase: true,
        },
      });

      if (!source) {
        this.logger.warn(`Source with UUID: ${dto.uuid} not found`);
        throw new RpcException(`Source with UUID: ${dto.uuid} not found`);
      }

      return source;
    } catch (error) {
      this.logger.error(
        `Error fetching source with UUID: ${dto.uuid}: ${error}`,
        error,
      );
      throw new RpcException(error);
    }
  }
}
