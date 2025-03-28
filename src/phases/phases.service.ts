import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { ActivityStatus, DataSource } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, EVENTS, JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import { Queue } from 'bull';
import { TriggerService } from 'src/trigger/trigger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GetPhaseDto } from './dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

export declare const MS_TIMEOUT = 500000;
@Injectable()
export class PhasesService {
  logger = new Logger(PhasesService.name);
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

  async create(payload: CreatePhaseDto) {
    const {
      name,
      source,
      river_basin,
      activeYear,
      canRevert,
      canTriggerPayout,
      receivedMandatoryTriggers,
      receivedOptionalTriggers,
      requiredMandatoryTriggers,
      requiredOptionalTriggers,
    } = payload;

    this.logger.log(
      `Creating new phase with ${name} source: ${source} river_basin: ${river_basin}`,
    );

    try {
      return await this.prisma.phase.create({
        data: {
          name,
          source: {
            connectOrCreate: {
              // <---- This will work like upsert, if the source is not found it will create a new one
              create: {
                source: source,
                riverBasin: river_basin,
              },
              where: {
                source_riverBasin: {
                  source: source,
                  riverBasin: river_basin,
                },
              },
            },
          },
          activeYear,
          canRevert,
          canTriggerPayout,
          receivedMandatoryTriggers,
          receivedOptionalTriggers,
          requiredMandatoryTriggers,
          requiredOptionalTriggers,
        },
      });
    } catch (error) {
      this.logger.error('Error while creatiing new Phase', error);
      throw new RpcException(error);
    }
  }

  findAll(payload: GetPhaseDto) {
    const { activeYear, name, river_basin, source,  ...dto } = payload;

    // Created a conditions array to filter the data based on the query params
    const conditions = {
      ...(name && { name: name }),
      ...((source || river_basin) && {
        source: {
          ...(source && { source: source }),
          ...(river_basin && {
            riverBasin: {
              contains: river_basin,
              mode: 'insensitive',
            },
          }),
        },
      }),
      ...(activeYear && {
        activeYear: activeYear,
      }),
    };

    return paginate(
      this.prisma.phase,
      {
        where: {
          ...conditions,
        },
        include: {
          source: true,
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
  }

  async findOne(uuid: string) {
    try {
      this.logger.log(`Fetching phase with uuid: ${uuid}`);
      return await this.prisma.phase.findUnique({
        where: { uuid },
        include: {
          source: true,
        },
      });
    } catch (error) {
      this.logger.error('Error while fetching phase', error);
      throw new RpcException(error);
    }
  }

  async update(uuid: string, dto: UpdatePhaseDto) {
    const { sourceId, ...rest } = dto;
    try {
      return await this.prisma.phase.update({
        where: { uuid },
        data: {
          ...rest,
          name: dto.name,
          source: {
            connect: {
              uuid: sourceId,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error while updating phase', error);
      throw new RpcException(error);
    }
  }

  async getOne(uuid: string) {
    try {
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
          source: true,
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
    } catch (error) {
      this.logger.error('Error while fetching phase', error);
      throw new RpcException(error);
    }
  }

  async activatePhase(uuid: string) {
    try {
      const phaseDetails = await this.prisma.phase.findUnique({
        where: {
          uuid: uuid,
        },
        include: {
          source: true,
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
      // TODO: need to refactor this logic
      for (const activity of phaseActivities) {
        const activityComms = JSON.parse(
          JSON.stringify(activity.activityCommunication),
        );
        for (const comm of activityComms) {
          this.client
            .send(
              {
                cmd: JOBS.ACTIVITIES.COMMUNICATION.TRIGGER_CAMPAIGN,
                location: phaseDetails?.source.riverBasin,
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

      this.logger.log(
        `${phaseActivities.length} activities completed for phase ${uuid}`,
      );

      if (phaseDetails.canTriggerPayout) {
        this.logger.log(
          `Phase ${phaseDetails.uuid} has active payout so, assigning token to ${phaseDetails.source.riverBasin}`,
        );
        return firstValueFrom(
          this.client.send(
            {
              cmd: JOBS.PAYOUT.ASSIGN_TOKEN,
              location: phaseDetails?.source.riverBasin,
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

      this.logger.log(`Phase ${uuid} activated successfully`);

      // event to calculate reporting
      this.eventEmitter.emit(EVENTS.PHASE_ACTIVATED, {
        phaseId: phaseDetails.uuid,
      });

      return updatedPhase;
    } catch (error) {
      this.logger.error('Error while activating phase', error);
      throw new RpcException(error);
    }
  }

  async addTriggersToPhases(payload) {
    try {
      const { uuid, triggers, triggerRequirements } = payload;

      const phase = await this.prisma.phase.findUnique({
        where: {
          uuid: uuid,
        },
      });

      if (!phase) {
        this.logger.warn(`Phase with uuid ${uuid} not found`);
        throw new RpcException(`Phase with uuid ${uuid} not found`);
      }

      if (phase.isActive) {
        this.logger.warn('Cannot add triggers to an active phase.');
        throw new BadRequestException(
          'Cannot add triggers to an active phase.',
        );
      }

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
    } catch (error) {
      this.logger.error('Error while adding triggers to phase', error);
      throw new RpcException(error);
    }
  }

  async revertPhase(appId: string, phaseId: string) {
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

    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid: phaseId,
      },
      include: {
        source: true,
        Trigger: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    if (!phase) {
      this.logger.log(`Phase with uuid ${phaseId} not found`);
      throw new RpcException('Phase not found.');
    }

    if (!phase.Trigger.length || !phase.isActive || !phase.canRevert) {
      this.logger.log(`Phase with uuid ${phaseId} cannot be reverted`);
      throw new RpcException('Phase cannot be reverted.');
    }

    for (const trigger of phase.Trigger) {
      const { repeatKey } = trigger;
      if (phase.source.source === DataSource.MANUAL) {
        await this.triggerService.create(appId, {
          title: trigger.title,
          isMandatory: trigger.isMandatory,
          phaseId: trigger.phaseId,
        });
      } else {
        await this.triggerService.create(appId, {
          title: trigger.title,
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

  async findByLocation(river_basin: string, activeYear?: string) {
    try {
      this.logger.log(
        `Fetching phase by location ${river_basin} activeYear: ${activeYear}`,
      );
      return await this.prisma.phase.findMany({
        where: {
          ...(activeYear && { activeYear }),
          source: {
            riverBasin: {
              contains: river_basin,
              mode: 'insensitive',
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error while fetching phase by location', error);
      throw new RpcException(error);
    }
  }
}
