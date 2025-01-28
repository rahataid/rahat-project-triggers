import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTriggerDto, UpdateTriggerDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
import { DataSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, JOBS } from 'src/constant';
import { Queue } from 'bull';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class TriggerService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
  ) {}
  create(appId: string, dto: CreateTriggerDto) {
    if (!this.isValidDataSource(dto.dataSource)) {
      throw new BadRequestException('Please provide a valid data source!');
    }
    if (dto.dataSource === DataSource.MANUAL) {
      return this.createManualTrigger(appId, dto);
    }
    const sanitizedPayload: any = {
      ...dto,
      app: appId,
      repeatEvery: '30000',
    };

    return this.scheduleJob(sanitizedPayload);
  }
  findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[dto.sort] = dto.order;
    return paginate(
      this.prisma.trigger,
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
    return this.prisma.trigger.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateTriggerDto) {
    return this.prisma.trigger.update({
      where: {
        uuid,
      },
      data: dto,
    });
  }

  isValidDataSource(value: string): value is DataSource {
    return (Object.values(DataSource) as DataSource[]).includes(
      value as DataSource,
    );
  }

  createManualTrigger(appId: string, dto: CreateTriggerDto) {
    const uuid = randomUUID();

    const repeatKey = randomUUID();

    // const { activities, ...restData } = payload

    const createData = {
      repeatKey: repeatKey,
      uuid: uuid,
      app: appId,
      ...dto,
    };
    return this.prisma.trigger.create({
      data: createData,
    });
  }

  private async scheduleJob(payload: any) {
    const uuid = randomUUID();

    const { ...restOfPayload } = payload;

    const jobPayload = {
      ...restOfPayload,
      uuid,
    };

    const repeatable = await this.scheduleQueue.add(
      JOBS.SCHEDULE.ADD,
      jobPayload,
      {
        jobId: uuid,
        attempts: 3,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        repeat: {
          every: Number(payload.repeatEvery),
        },
        removeOnFail: true,
      },
    );
    const repeatableKey = repeatable.opts.repeat.key;

    const createData = {
      repeatKey: repeatableKey,
      uuid: uuid,
      isDeleted: false,
      ...restOfPayload,
    };

    await this.prisma.trigger.create({
      data: {
        ...createData,
      },
    });

    return createData;
  }
}
