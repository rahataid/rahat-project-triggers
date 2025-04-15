import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class SourceService {
  logger = new Logger(SourceService.name);
  constructor(private prisma: PrismaService) {}

  findAll() {
    try {
      this.logger.log('Fetching all sources');
      const sources = this.prisma.source.findMany({
        include: {
          Phase: true,
        },
      });
      return sources;
    } catch (error) {
      this.logger.error(`Error fetching sources: ${error}`, error);
      throw new RpcException(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} source`;
  }
}
