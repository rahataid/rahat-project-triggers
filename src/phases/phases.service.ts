import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { ActivityStatus, DataSource, Phases } from '@prisma/client';
import { PaginationDto } from 'src/common/dto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, EVENTS, JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import { Queue } from 'bull';
import { TriggerService } from 'src/trigger/trigger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

export declare const MS_TIMEOUT = 500000;
@Injectable()
export class PhasesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TriggerService))
    private readonly triggerService: TriggerService,
    private eventEmitter: EventEmitter2,
    @InjectQueue(BQUEUE.CONTRACT) private readonly contractQueue: Queue,
    @InjectQueue(BQUEUE.COMMUNICATION)
    private readonly communicationQueue: Queue,
    @Inject(MS_TRIGGER_CLIENTS.RAHAT) private readonly client: ClientProxy,
  ) {}

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

  async getOne(uuid: string) {
    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid,
      },
      include: {
        Trigger: {
          where: {
            isDeleted: false,
          },
          include: {
            phase: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        Activity: true,
      },
    });

    const totalMandatoryTriggers = await this.prisma.trigger.count({
      where: {
        phaseId: phase.uuid,
        isMandatory: true,
        isDeleted: false,
      },
    });
    const totalOptionalTriggers = await this.prisma.trigger.count({
      where: {
        phaseId: phase.uuid,
        isMandatory: false,
        isDeleted: false,
      },
    });

    const triggerRequirements = {
      mandatoryTriggers: {
        totalTriggers: totalMandatoryTriggers,
        requiredTriggers: phase.requiredMandatoryTriggers,
        receivedTriggers: phase.receivedMandatoryTriggers,
      },
      optionalTriggers: {
        totalTriggers: totalOptionalTriggers,
        requiredTriggers: phase.requiredOptionalTriggers,
        receivedTriggers: phase.receivedOptionalTriggers,
      },
    };

    return { ...phase, triggerRequirements };
  }

  async activatePhase(uuid: string) {
    const phaseDetails = await this.prisma.phase.findUnique({
      where: {
        uuid: uuid,
      },
      include: {
        Activity: {
          where: {
            isAutomated: true,
            status: {
              not: ActivityStatus.COMPLETED,
            },
            isDeleted: false,
          },
        },
      },
    });

    const phaseActivities = phaseDetails.Activity;
    for (const activity of phaseActivities) {
      const activityComms = JSON.parse(
        JSON.stringify(activity.activityCommunication),
      );
      for (const comm of activityComms) {
        this.client
          .send(
            {
              cmd: JOBS.ACTIVITIES.COMMUNICATION.TRIGGER_CAMPAIGN,
              location: phaseDetails?.location,
            },
            {
              communicationId: comm?.communicationId,
            },
          )
          .subscribe({
            next: (response) => console.log('Success:', response),
            error: (err) => console.error('Microservice Error:', err),
          });
      }
      await this.prisma.activity.update({
        where: {
          uuid: activity.uuid,
        },
        data: {
          status: ActivityStatus.COMPLETED,
        },
      });
    }

    if (phaseDetails.canTriggerPayout) {
      return firstValueFrom(
        this.client.send(
          {
            cmd: JOBS.PAYOUT.ASSIGN_TOKEN,
            location: phaseDetails?.location,
          },
          {},
        ),
      );
    }
    const updatedPhase = await this.prisma.phase.update({
      where: {
        uuid: uuid,
      },
      data: {
        isActive: true,
        activatedAt: new Date(),
      },
    });

    // event to calculate reporting
    this.eventEmitter.emit(EVENTS.PHASE_ACTIVATED, {
      phaseId: phaseDetails.uuid,
    });

    return updatedPhase;
  }

  async addTriggersToPhases(payload) {
    const { uuid, triggers, triggerRequirements } = payload;
    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid: uuid,
      },
    });
    if (!phase) throw new BadRequestException('Phase not found.');
    if (phase.isActive)
      throw new BadRequestException('Cannot add triggers to an active phase.');

    for (const trigger of triggers) {
      const tg = await this.prisma.trigger.findUnique({
        where: { repeatKey: trigger.repeatKey },
      });

      await this.prisma.trigger.update({
        where: {
          uuid: tg.uuid,
        },
        data: {
          isMandatory: trigger.isMandatory,
          phaseId: phase.uuid,
        },
      });
    }
    const updatedPhase = await this.prisma.phase.update({
      where: {
        uuid: phase.uuid,
      },
      data: {
        requiredMandatoryTriggers:
          triggerRequirements.mandatoryTriggers.requiredTriggers,
        requiredOptionalTriggers:
          triggerRequirements.optionalTriggers.requiredTriggers,
      },
    });

    return updatedPhase;
  }

  async revertPhase(appId, payload) {
    const activitiesCompletedBeforePhaseActivated =
      await this.prisma.activity.findMany({
        where: {
          differenceInTriggerAndActivityCompletion: null,
          status: ActivityStatus.COMPLETED,
          isDeleted: false,
        },
        include: {
          phase: true,
        },
      });

    for (const activity of activitiesCompletedBeforePhaseActivated) {
      const timeDifference = getTriggerAndActivityCompletionTimeDifference(
        activity.phase.activatedAt,
        activity.completedAt,
      );
      await this.prisma.activity.update({
        where: {
          uuid: activity.uuid,
        },
        data: {
          differenceInTriggerAndActivityCompletion: timeDifference,
        },
      });
    }

    const { phaseId } = payload;
    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid: phaseId,
      },
      include: {
        Trigger: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    if (!phase) throw new BadRequestException('Phase not found.');

    if (!phase.Trigger.length || !phase.isActive || !phase.canRevert)
      throw new BadRequestException('Phase cannot be reverted.');

    for (const trigger of phase.Trigger) {
      const { repeatKey } = trigger;
      if (trigger.dataSource === DataSource.MANUAL) {
        await this.triggerService.create(appId, {
          title: trigger.title,
          dataSource: trigger.dataSource,
          isMandatory: trigger.isMandatory,
          phaseId: trigger.phaseId,
        });
      } else {
        await this.triggerService.create(appId, {
          title: trigger.title,
          dataSource: trigger.dataSource,
          location: trigger.location,
          triggerStatement: JSON.parse(
            JSON.stringify(trigger.triggerStatement),
          ),
          isMandatory: trigger.isMandatory,
          phaseId: trigger.phaseId,
        });
      }

      await this.triggerService.archive(repeatKey);
    }

    const currentDate = new Date();

    const updatedPhase = await this.prisma.phase.update({
      where: {
        uuid: phaseId,
      },
      data: {
        receivedMandatoryTriggers: 0,
        receivedOptionalTriggers: 0,
        isActive: false,
        activatedAt: null,
        updatedAt: currentDate,
      },
    });

    this.eventEmitter.emit(EVENTS.PHASE_REVERTED, {
      phaseId: phase.uuid,
      revertedAt: currentDate.toISOString(),
    });

    return updatedPhase;
  }

  async findByLocation(appId: string, location: string) {
    return this.prisma.phase.findMany({
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
