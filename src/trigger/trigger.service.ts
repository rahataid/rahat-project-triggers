import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateTriggerDto, GetTriggersDto, UpdateTriggerDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { DataSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, JOBS } from 'src/constant';
import { Queue } from 'bull';
import { PhasesService } from 'src/phases/phases.service';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
// remaining remove function
@Injectable()
export class TriggerService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PhasesService))
    private readonly phasesService: PhasesService,
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
    @InjectQueue(BQUEUE.TRIGGER) private readonly triggerQueue: Queue,
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
  getAll(appId: string, dto: GetTriggersDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[dto.sort] = dto.order;
    return paginate(
      this.prisma.trigger,
      {
        where: {
          isDeleted: false,
          ...(dto.phaseId && { phaseId: dto.phaseId }),

          app: appId,
        },
        include: {
          phase: true,
        },
        orderBy,
      },
      {
        page: dto.page,
        perPage: dto.perPage,
      },
    );
  }

  async getOne(repeatKey: string) {
    return this.prisma.trigger.findUnique({
      where: {
        repeatKey: repeatKey,
      },
      include: {
        phase: true,
      },
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
  async remove(repeatKey: string) {
    const trigger = await this.prisma.trigger.findUnique({
      where: {
        repeatKey: repeatKey,
        isDeleted: false,
      },
      include: { phase: true },
    });
    if (!trigger)
      throw new BadRequestException(
        `Active trigger with id: ${repeatKey} not found.`,
      );
    if (trigger.isTriggered)
      throw new BadRequestException(`Cannot remove an activated trigger.`);
    if (trigger.phase.isActive)
      throw new BadRequestException(
        'Cannot remove triggers from an active phase.',
      );

    const phaseDetail = await this.phasesService.getOne(trigger.phaseId);

    // check if optional triggers criterias are disrupted
    if (!trigger.isMandatory) {
      const totalTriggersAfterDeleting =
        Number(phaseDetail.triggerRequirements.optionalTriggers.totalTriggers) -
        1;
      if (totalTriggersAfterDeleting < phaseDetail.requiredOptionalTriggers) {
        throw new BadRequestException('Trigger criterias disrupted.');
      }
    }

    // if(trigger.isMandatory){
    //   const totalTriggersAfterDeleting = Number(phaseDetail.triggerRequirements.mandatoryTriggers.totalTriggers) - 1
    //   if(totalTriggersAfterDeleting<phaseDetail.requiredMandatoryTriggers) {
    //     throw new RpcException('Trigger criterias disrupted.')
    //   }
    // }

    await this.scheduleQueue.removeRepeatableByKey(repeatKey);
    const updatedTrigger = await this.prisma.trigger.update({
      where: {
        repeatKey: repeatKey,
      },
      data: {
        isDeleted: true,
      },
    });

    if (trigger.isMandatory) {
      await this.prisma.phase.update({
        where: {
          uuid: trigger.phaseId,
        },
        data: {
          requiredMandatoryTriggers: {
            decrement: 1,
          },
        },
      });
    }

    // if(!trigger.isMandatory){
    //   await this.prisma.phases.update({
    //     where: {
    //       uuid: trigger.phaseId
    //     },
    //     data: {
    //       requiredOptionalTriggers: {
    //         decrement: 1
    //       }
    //     }
    //   })
    // }

    this.triggerQueue.add(JOBS.TRIGGER.REACHED_THRESHOLD, trigger, {
      attempts: 3,
      removeOnComplete: true,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    return updatedTrigger;
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
  async activateTrigger(uuid: string, payload: UpdateTriggerDto) {
    const { triggeredBy, triggerDocuments } = payload;

    const trigger = await this.prisma.trigger.findUnique({
      where: {
        repeatKey: payload?.repeatKey,
      },
    });

    if (!trigger) throw new BadRequestException('Trigger not found.');
    if (trigger.isTriggered)
      throw new BadRequestException('Trigger has already been activated.');
    if (trigger.dataSource !== DataSource.MANUAL)
      throw new BadRequestException('Cannot activate an automated trigger.');

    const triggerDocs = triggerDocuments?.length
      ? triggerDocuments
      : trigger?.triggerDocuments || [];

    const updatedTrigger = await this.prisma.trigger.update({
      where: {
        uuid,
      },
      data: {
        isTriggered: true,
        triggeredAt: new Date(),
        triggerDocuments: JSON.parse(JSON.stringify(triggerDocs)),
        notes: payload?.notes || '',
        triggeredBy,
      },
    });

    if (trigger.isMandatory) {
      await this.prisma.phase.update({
        where: {
          uuid: trigger.phaseId,
        },
        data: {
          receivedMandatoryTriggers: {
            increment: 1,
          },
        },
      });
    }

    if (!trigger.isMandatory) {
      await this.prisma.phase.update({
        where: {
          uuid: trigger.phaseId,
        },
        data: {
          receivedOptionalTriggers: {
            increment: 1,
          },
        },
      });
    }

    this.triggerQueue.add(JOBS.TRIGGER.REACHED_THRESHOLD, trigger, {
      attempts: 3,
      removeOnComplete: true,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    return updatedTrigger;
  }

  async archive(repeatKey: string) {
    const trigger = await this.prisma.trigger.findUnique({
      where: {
        repeatKey: repeatKey,
        isDeleted: false,
      },
    });
    if (!trigger)
      throw new BadRequestException(
        `Active trigger with id: ${repeatKey} not found.`,
      );

    await this.scheduleQueue.removeRepeatableByKey(repeatKey);
    const updatedTrigger = await this.prisma.trigger.update({
      where: {
        repeatKey: repeatKey,
      },
      data: {
        isDeleted: true,
      },
    });

    return updatedTrigger;
  }

  async findByLocation(appId: string, location: string) {
    return this.prisma.trigger.findMany({
      where: {
        app: appId,
        location: {
          contains: location,
          mode: 'insensitive',
        },
      },
    });
  }
}
