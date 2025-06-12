import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreatePhaseDto } from './dto/create-phase.dto';
import {
  ConfigureThresholdPhaseDto,
  UpdatePhaseDto,
} from './dto/update-phase.dto';
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
import { GetPhaseByName, GetPhaseDto } from './dto';

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

    if (!activeYear) {
      this.logger.error('Missing active year in payload');
      throw new BadRequestException('Active year is required');
    }

    try {
      return await this.prisma.phase.create({
        data: {
          name,
          source: {
            connectOrCreate: {
              // <---- This will work like upsert, if the source is not found it will create a new one
              create: {
                source: [source],
                riverBasin: river_basin,
              },
              where: {
                riverBasin: river_basin,
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

  async findAll(payload: GetPhaseDto) {
    const { activeYear, name, riverBasin, source, ...dto } = payload;

    // Created a conditions array to filter the data based on the query params
    const conditions = {
      ...(name && { name: name }),
      ...(riverBasin && {
        source: {
          ...(riverBasin && {
            riverBasin: {
              contains: riverBasin,
              mode: 'insensitive',
            },
          }),
        },
      }),
      ...(activeYear && {
        activeYear: activeYear,
      }),
    };

    const paginatedData = await paginate(
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

    const newData = await Promise.all(
      paginatedData?.data.map(async (phase: any) => {
        const phaseStats = await this.generatePhaseTriggersStats(phase.uuid);
        return {
          ...phase,
          phaseStats,
        };
      }),
    );

    return {
      ...paginatedData,
      data: newData,
    };
  }

  async generatePhaseTriggersStats(phaseId: string) {
    try {
      const totalMandatoryTriggers = await this.prisma.trigger.count({
        where: {
          phaseId: phaseId,
          isMandatory: true,
          isDeleted: false,
        },
      });

      const totalMandatoryTriggersTriggered = await this.prisma.trigger.count({
        where: {
          phaseId: phaseId,
          isMandatory: true,
          isTriggered: true,
          isDeleted: false,
        },
      });

      const totalOptionalTriggers = await this.prisma.trigger.count({
        where: {
          phaseId: phaseId,
          isMandatory: false,
          isDeleted: false,
        },
      });

      const totalOptionalTriggersTriggered = await this.prisma.trigger.count({
        where: {
          phaseId: phaseId,
          isMandatory: false,
          isTriggered: true,
          isDeleted: false,
        },
      });

      const triggers = await this.prisma.trigger.findMany({
        where: {
          phaseId: phaseId,
          isDeleted: false,
        },
      });

      return {
        triggers,
        totalTriggers: triggers.length,
        totalMandatoryTriggers,
        totalMandatoryTriggersTriggered,
        totalOptionalTriggers,
        totalOptionalTriggersTriggered,
      };
    } catch (error) {
      this.logger.warn('Error while generating phase triggers stats', error);
      throw new RpcException(error);
    }
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
    this.logger.log(`Fetching phase with uuid: ${uuid}`);
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
              title: 'desc',
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

  async getOneByDetail(payload: GetPhaseByName) {
    const { appId, phase, uuid, activeYear, riverBasin } = payload;
    let phaseDetails = null;

    if (!uuid) {
      if (!activeYear || !riverBasin) {
        this.logger.warn('Active year and river basin are required');
        throw new RpcException('Active year and river basin are required');
      }

      phaseDetails = await this.prisma.phase.findFirst({
        where: {
          name: phase,
          riverBasin,
          activeYear,
          Activity: {
            some: {
              app: appId,
            },
          },
        },
        include: {
          source: true,
        },
      });
    } else {
      phaseDetails = await this.prisma.phase.findUnique({
        where: {
          uuid,
        },
        include: {
          source: true,
        },
      });
    }

    if (!phaseDetails) {
      this.logger.warn(`Phase with uuid ${uuid} not found`);
      throw new RpcException(`Phase with uuid ${uuid} not found`);
    }

    const triggers = await this.prisma.trigger.findMany({
      where: {
        phaseId: phaseDetails.uuid,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalMandatoryTriggers = await this.prisma.trigger.count({
      where: {
        phaseId: phaseDetails.uuid,
        isMandatory: true,
        isDeleted: false,
      },
    });

    const totalMandatoryTriggersTriggered = await this.prisma.trigger.count({
      where: {
        phaseId: phaseDetails.uuid,
        isMandatory: true,
        isTriggered: true,
        isDeleted: false,
      },
    });

    const totalOptionalTriggers = await this.prisma.trigger.count({
      where: {
        phaseId: phaseDetails.uuid,
        isMandatory: false,
        isDeleted: false,
      },
    });

    const totalOptionalTriggersTriggered = await this.prisma.trigger.count({
      where: {
        phaseId: phaseDetails.uuid,
        isMandatory: false,
        isTriggered: true,
        isDeleted: false,
      },
    });

    return {
      ...phaseDetails,
      triggers,
      totalTriggers: triggers.length,
      totalMandatoryTriggers,
      totalMandatoryTriggersTriggered,
      totalOptionalTriggers,
      totalOptionalTriggersTriggered,
    };
  }

  async getPhaseBySource(
    source: DataSource,
    riverBasin: string,
    phase: string,
    activeYear?: string,
  ) {
    try {
      this.logger.log(
        `Fetching phase by source ${source} riverBasin: ${riverBasin}`,
      );
      return await this.prisma.phase.findFirst({
        where: {
          source: {
            riverBasin: riverBasin,
          },
          ...(activeYear && { activeYear: activeYear }),
        },
        include: {
          source: true,
        },
        orderBy: {
          activeYear: 'desc',
        },
      });
    } catch (error) {
      this.logger.error('Error while fetching phase by source', error);
      throw new RpcException(error);
    }
  }

  async getAppIdByPhase(phaseId: string): Promise<string[]> {
    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid: phaseId,
      },
      include: {
        Activity: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    const appIds = Array.from(
      new Set(phase.Activity.map((activity) => activity.app)),
    );

    return appIds;
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

      if (!phaseDetails) {
        this.logger.warn(`No phase found with uuid ${uuid} to activate`);
        throw new RpcException(`No phase found with uuid ${uuid} to activate`);
      }

      const phaseActivities = phaseDetails.Activity;
      for (const activity of phaseActivities) {
        const activityComms = JSON.parse(
          JSON.stringify(activity.activityCommunication),
        );

        this.logger.log(
          `Adding total ${activityComms.length} communication in Queue for activity ${activity.uuid}`,
        );

        for (const comm of activityComms) {
          this.communicationQueue.add(
            JOBS.ACTIVITIES.COMMUNICATION.TRIGGER,
            {
              communicationId: comm?.communicationId,
              activityId: activity?.uuid,
              appId: activity?.app,
            },
            {
              attempts: 3,
              removeOnComplete: true,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            },
          );
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

        const appIds = await this.getAppIdByPhase(phaseDetails.uuid);
        this.logger.log(`Running disbursement for ${appIds.length} apps`);

        for (const appId of appIds) {
          const disburseName = `${phaseDetails.name}-${phaseDetails.source.riverBasin}-${Date.now()}`;
          const stellerDistrub = await firstValueFrom(
            this.client.send(
              {
                cmd: JOBS.STELLAR.DISBURSE,
                uuid: appId,
              },
              {
                dName: disburseName,
              },
            ),
          );
          this.logger.log(`Disbursement for ${appId}`, stellerDistrub);
        }
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
      // TODO: Need to add feature to calcualte the Stats when phase changes.
      this.eventEmitter.emit(EVENTS.PHASE_ACTIVATED, {
        phaseId: phaseDetails.uuid,
      });

      return updatedPhase;
    } catch (error) {
      this.logger.error('Error while activating phase', error);
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
      if (trigger.source === DataSource.MANUAL) {
        await this.triggerService.create(appId, {
          title: trigger.title,
          isMandatory: trigger.isMandatory,
          phaseId: trigger.phaseId,
          source: trigger.source,
        });
      } else {
        await this.triggerService.create(appId, {
          title: trigger.title,
          triggerStatement: JSON.parse(
            JSON.stringify(trigger.triggerStatement),
          ),
          isMandatory: trigger.isMandatory,
          phaseId: trigger.phaseId,
          source: trigger.source,
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

  async configurePhaseThreshold(dto: ConfigureThresholdPhaseDto) {
    const { uuid, requiredMandatoryTriggers, requiredOptionalTriggers } = dto;
    return this.prisma.phase.update({
      where: {
        uuid,
      },
      data: {
        requiredOptionalTriggers,
        requiredMandatoryTriggers,
      },
    });
  }
}
