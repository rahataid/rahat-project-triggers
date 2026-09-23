import { paginator, PaginatorTypes, PrismaService } from '@lib/database';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  CreateCommunicationDto,
  GetCommunicationDto,
  UpdateCommunicationDto,
} from './dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;
const DEFAULT_SORT_FIELD = 'createdAt';

const WRITABLE_FIELDS = [
  'xrefId',
  'title',
  'message',
  'subject',
  'audioURL',
  'sessionId',
  'transportId',
  'groupId',
  'groupType',
  'createdBy',
] as const;

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Picks only the columns this model owns. Callers reach us over the message
   * bus, which appends its own keys (the platform injects `user` into every
   * payload), and no global ValidationPipe strips them before we get here.
   */
  private toWritableData(
    dto: CreateCommunicationDto | UpdateCommunicationDto,
  ): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of WRITABLE_FIELDS) {
      const value = dto[field];
      if (value !== undefined) data[field] = value;
    }

    if (data.audioURL) data.audioURL = { ...data.audioURL };

    return data;
  }

  async create(dto: CreateCommunicationDto) {
    this.logger.log(`Creating communication: ${dto.title}`);

    try {
      return await this.prisma.communication.create({
        data: this.toWritableData(dto) as any,
      });
    } catch (error: any) {
      this.logger.error('Failed to create communication', error);
      throw new RpcException(
        error?.message || 'Failed to create communication',
      );
    }
  }

  async findAll(dto: GetCommunicationDto) {
    const {
      title,
      xrefId,
      groupId,
      groupType,
      transportId,
      sessionId,
      page = 1,
      perPage = 10,
      sort = DEFAULT_SORT_FIELD,
      order = 'desc',
    } = dto || {};

    const sortField = SORTABLE_FIELDS.includes(sort as any)
      ? sort
      : DEFAULT_SORT_FIELD;

    const query = {
      where: {
        isDeleted: false,
        ...(title && { title: { contains: title, mode: 'insensitive' } }),
        ...(xrefId && { xrefId }),
        ...(groupId && { groupId }),
        ...(groupType && { groupType }),
        ...(transportId && { transportId }),
        ...(sessionId && { sessionId }),
      },
      orderBy: {
        [sortField]: order,
      },
    };

    try {
      return await paginate(this.prisma.communication, query, {
        page,
        perPage,
      });
    } catch (error: any) {
      this.logger.error('Failed to list communications', error);
      throw new RpcException(error?.message || 'Failed to list communications');
    }
  }

  async findOne(uuid: string) {
    const communication = await this.prisma.communication.findFirst({
      where: {
        uuid,
        isDeleted: false,
      },
    });

    if (!communication) {
      throw new RpcException(`Communication with uuid ${uuid} not found`);
    }

    return communication;
  }

  async update(uuid: string, dto: UpdateCommunicationDto) {
    this.logger.log(`Updating communication: ${uuid}`);
    await this.findOne(uuid);

    try {
      return await this.prisma.communication.update({
        where: { uuid },
        data: this.toWritableData(dto),
      });
    } catch (error: any) {
      this.logger.error(`Failed to update communication ${uuid}`, error);
      throw new RpcException(
        error?.message || 'Failed to update communication',
      );
    }
  }

  async remove(uuid: string) {
    this.logger.log(`Removing communication: ${uuid}`);
    await this.findOne(uuid);

    try {
      return await this.prisma.communication.update({
        where: { uuid },
        data: { isDeleted: true },
      });
    } catch (error: any) {
      this.logger.error(`Failed to remove communication ${uuid}`, error);
      throw new RpcException(
        error?.message || 'Failed to remove communication',
      );
    }
  }
}
