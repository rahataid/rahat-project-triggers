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
  SetExtendedTriggerLogicDto,
  UpdatePhaseDto,
} from './dto';
import {
  paginator,
  PaginatorTypes,
  PrismaService,
  ActivityStatus,
  DataSource,
} from '@lib/database';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, EVENTS, JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import type { Queue } from 'bull';
import { TriggerService } from 'src/trigger/trigger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  GetPhaseByDetailDto,
  GetPhaseByLocationDto,
  GetPhaseDto,
  RevertPhaseDto,
} from './dto';
import { activities } from '../utils/activities';

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
      requiredMandatoryTriggers,
      requiredOptionalTriggers,
      extendedTriggerLogic,
      isRequiredLeadTime,
      disbursementMethods,
    } = payload;

    this.logger.log(
      `Creating new phase with ${name} source: ${source} river_basin: ${river_basin}`,
    );

    if (!name || !source || !river_basin) {
      this.logger.error('Missing required fields in payload');
      throw new RpcException('Name, source and river basin are required');
    }

    if (!activeYear) {
      this.logger.error('Missing active year in payload');
      throw new RpcException('Active year is required');
    }

    const existingPhase = await this.prisma.phase.findFirst({
      where: {
        name,
        activeYear,
        source: {
          riverBasin: river_basin,
        },
      },
    });

    if (existingPhase) {
      this.logger.warn(
        `Phase with name ${name}, activeYear ${activeYear} and riverBasin ${river_basin} already exists`,
      );
      throw new RpcException(
        `Phase with name ${name}, activeYear ${activeYear} and riverBasin ${river_basin} already exists`,
      );
    }

    if (canTriggerPayout && !disbursementMethods?.length) {
      throw new RpcException(
        'disbursementMethods is required when canTriggerPayout is true',
      );
    }

    if (disbursementMethods?.length) {
      await this.validateUniqueDisbursementMethods(
        river_basin,
        disbursementMethods,
      );
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
          requiredMandatoryTriggers: requiredMandatoryTriggers || 0,
          requiredOptionalTriggers: requiredOptionalTriggers || 0,
          ...(extendedTriggerLogic && { extendedTriggerLogic }),
          isRequiredLeadTime: isRequiredLeadTime || false,
          ...(disbursementMethods && {
            disbursementConfig: { disbursementMethods } as unknown as object,
          }),
        },
      });
    } catch (error: any) {
      this.logger.error('Error while creating new Phase', error);
      throw new RpcException(error);
    }
  }

  async findAll(payload: GetPhaseDto) {
    this.logger.log(`Fetching all phases`);
    const { activeYear, name, riverBasin, ...dto } = payload;

    // Created a conditions array to filter the data based on the query params
    const conditions = {
      ...(name && { name: name }),
      ...(riverBasin && {
        source: {
          riverBasin: {
            contains: riverBasin,
            mode: 'insensitive',
          },
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

    // Handle case where data might be undefined or empty
    if (!paginatedData?.data || paginatedData.data.length === 0) {
      return {
        ...paginatedData,
        data: [],
      };
    }

    const newData = await Promise.all(
      paginatedData.data.map(async (phase: any) => {
        const phaseStats =
          await this.triggerService.generateTriggersStatsForPhase(phase.uuid);
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

  async update(payload: UpdatePhaseDto) {
    const { uuid, ...rest } = payload;

    const phase = await this.findOrThrow(uuid);

    if (phase.isActive) {
      throw new RpcException('Cannot update an active phase');
    }

    if (rest.canTriggerPayout && !rest.disbursementMethods?.length) {
      throw new RpcException(
        'disbursementMethods is required when canTriggerPayout is true',
      );
    }

    if (rest.disbursementMethods?.length) {
      await this.validateUniqueDisbursementMethods(
        phase.riverBasin,
        rest.disbursementMethods,
        uuid,
      );
    }

    // Only these three fields are allowed to be updated
    const fields = {
      name: rest.name ?? phase.name,
      canRevert: rest.canRevert ?? phase.canRevert,
      canTriggerPayout: rest.canTriggerPayout ?? phase.canTriggerPayout,
      requiredMandatoryTriggers:
        rest.requiredMandatoryTriggers ?? phase.requiredMandatoryTriggers,
      requiredOptionalTriggers:
        rest.requiredOptionalTriggers ?? phase.requiredOptionalTriggers,
      ...(rest.extendedTriggerLogic !== undefined && {
        extendedTriggerLogic: rest.extendedTriggerLogic,
      }),
      isRequiredLeadTime: rest.isRequiredLeadTime ?? phase.isRequiredLeadTime,
      ...(rest.disbursementMethods !== undefined && {
        disbursementConfig: {
          disbursementMethods: rest.disbursementMethods,
        } as unknown as object,
      }),
    };

    try {
      return await this.prisma.phase.update({
        where: { uuid },
        data: {
          ...fields,
        },
      });
    } catch (error: any) {
      this.logger.error('Error while updating phase', error);
      throw new RpcException(error);
    }
  }

  async findOne(uuid: string) {
    this.logger.log(`Fetching phase with uuid: ${uuid}`);
    try {
      const phase = await this.prisma.phase.findUnique({
        where: {
          uuid,
        },
      });

      const triggerStash =
        await this.triggerService.generateTriggersStatsForPhase(phase.uuid);

      const triggerRequirements = {
        mandatoryTriggers: {
          totalTriggers: triggerStash.totalMandatoryTriggers,
          requiredTriggers: phase.requiredMandatoryTriggers,
          receivedTriggers: phase.receivedMandatoryTriggers,
        },
        optionalTriggers: {
          totalTriggers: triggerStash.totalOptionalTriggers,
          requiredTriggers: phase.requiredOptionalTriggers,
          receivedTriggers: phase.receivedOptionalTriggers,
        },
      };

      return { ...phase, triggerRequirements };
    } catch (error: any) {
      this.logger.error('Error while fetching phase', error);
      throw new RpcException(error);
    }
  }

  async getOneByDetail(payload: GetPhaseByDetailDto) {
    this.logger.log(`Getting phase with: ${JSON.stringify(payload)}`);

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
          _count: {
            select: { Activity: true },
          },
        },
      });
    } else {
      phaseDetails = await this.prisma.phase.findUnique({
        where: {
          uuid,
        },
        include: {
          source: true,
          _count: {
            select: { Activity: true },
          },
        },
      });
    }

    if (!phaseDetails) {
      this.logger.warn(`Phase with uuid ${uuid} not found`);
      throw new RpcException(`Phase with uuid ${uuid} not found`);
    }

    const triggerStash =
      await this.triggerService.generateTriggersStatsForPhase(
        phaseDetails.uuid,
      );

    return {
      ...phaseDetails,
      ...triggerStash,
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
    } catch (error: any) {
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

    if (!phase) {
      this.logger.warn(`No phase found with uuid ${phaseId}`);
      return [];
    }

    if (!phase.Activity || phase.Activity.length === 0) {
      this.logger.warn(`No activities found for phase ${phaseId}`);
      return [];
    }

    const appIds = Array.from(
      new Set(phase.Activity.map((activity) => activity.app).filter(Boolean)),
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
        return undefined;
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

      let disbursementCompleted = true;

      if (phaseDetails.canTriggerPayout) {
        this.logger.log(
          `Phase ${phaseDetails.uuid} has active payout so, assigning token to ${phaseDetails.source.riverBasin}`,
        );

        const appIds = await this.getAppIdByPhase(phaseDetails.uuid);
        this.logger.log(`Running disbursement for ${appIds.length} apps`);

        if (appIds.length === 0) {
          this.logger.warn(
            `No appIds found for phase ${phaseDetails.uuid}, skipping disbursement. Please add activity to start disbursement for this phase.`,
          );
        } else {
          const config = phaseDetails?.disbursementConfig as {
            disbursementMethods?: string[];
          } | null;
          const methods = config?.disbursementMethods ?? [];

          if (methods.length === 0) {
            this.logger.warn(
              `Phase ${phaseDetails.uuid} has canTriggerPayout=true but no disbursementMethods configured in disbursementConfig. Skipping disbursement.`,
            );
          }

          // if new disbursement methods are added in future, we can just add the mapping in methodJobMap without changing the rest of the code
          const methodJobMap: Record<string, string> = {
            TOKEN: JOBS.CHAIN.DISBURSE,
            GROUP_TOKEN: JOBS.GROUP_CASH_TRANSFER.DISBURSE,
            // INKIND: no event fired
          };

          const disbursementTasks = appIds.flatMap((appId) => {
            const disburseName = `${phaseDetails.name}-${phaseDetails.source.riverBasin}-${Date.now()}`;

            return methods
              .filter((method) => {
                const cmd = methodJobMap[method];
                if (!cmd) {
                  this.logger.warn(
                    `Job not found for disbursement method "${method}" for phase ${phaseDetails.uuid}, skipping`,
                  );
                }
                return !!cmd;
              })
              .map((method) => ({
                appId,
                method,
                disburseName,
                cmd: methodJobMap[method],
              }));
          });

          const results = await Promise.allSettled(
            disbursementTasks.map(({ appId, method, disburseName, cmd }) =>
              firstValueFrom(
                this.client
                  .send({ cmd, uuid: appId }, { dName: disburseName })
                  .pipe(timeout(30000)),
              ).then((result) => {
                this.logger.log(
                  `Disbursement method ${method} completed successfully for appId ${appId}`,
                  result,
                );
              }),
            ),
          );

          results.forEach((result, index) => {
            const { appId, method } = disbursementTasks[index];
            if (result.status === 'rejected') {
              this.logger.error(
                `Disbursement method ${method} FAILED for appId ${appId}:`,
                result.reason,
              );
              disbursementCompleted = false;
            }
          });
        }
      }

      // Activate phase regardless of disbursement status, but log the result
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
      this.eventEmitter.emit(EVENTS.NOTIFICATION.CREATE, {
        payload: {
          title: `${phaseDetails.name}  Phase Activated for ${phaseDetails.source.riverBasin}`,
          description: `${phaseDetails.name} Phase has been activated through automated trigger for year ${phaseDetails.activeYear}, in the ${phaseDetails.source.riverBasin} river basin.`,
          group: 'Phase Acivation',
          notify: true,
        },
      });

      if (!disbursementCompleted) {
        this.logger.warn(
          `Phase ${uuid} activated but disbursement had errors. Check logs for details.`,
        );
      }

      console.log('///////////////////////');
      console.log('///////////////////////');
      console.log('///////////////////////');

      return updatedPhase;
    } catch (error: any) {
      this.logger.error('Error while activating phase', error);
      return undefined;
    }
  }

  async addTriggersToPhases(payload) {
    try {
      const { uuid, triggers, triggerRequirements, extendedTriggerLogic } =
        payload;

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
        await this.prisma.trigger.update({
          where: {
            uuid: trigger.uuid,
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
          ...(extendedTriggerLogic !== undefined && { extendedTriggerLogic }),
        },
      });

      return updatedPhase;
    } catch (error: any) {
      this.logger.error('Error while adding triggers to phase', error);
      throw new RpcException(error);
    }
  }

  async revertPhase(payload: RevertPhaseDto) {
    const { appId, phaseId } = payload;
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
        await this.triggerService.createTrigger(
          appId,
          {
            title: trigger.title,
            description: trigger?.description,
            isMandatory: trigger.isMandatory,
            phaseId: trigger.phaseId,
            source: trigger.source,
          },
          trigger.createdBy,
        );
      } else {
        await this.triggerService.createTrigger(
          appId,
          {
            title: trigger.title,
            description: trigger?.description,
            triggerStatement: JSON.parse(
              JSON.stringify(trigger.triggerStatement),
            ),
            isMandatory: trigger.isMandatory,
            phaseId: trigger.phaseId,
            source: trigger.source,
          },
          trigger.createdBy,
        );
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

  async findByLocation(payload: GetPhaseByDetailDto) {
    const { riverBasin, activeYear } = payload;
    try {
      this.logger.log(
        `Fetching phase by location ${riverBasin} activeYear: ${activeYear}`,
      );
      return await this.prisma.phase.findMany({
        where: {
          ...(activeYear && { activeYear }),
          source: {
            riverBasin: {
              contains: riverBasin,
              mode: 'insensitive',
            },
          },
        },
      });
    } catch (error: any) {
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

  async findOrThrow(uuid: string) {
    const phase = await this.prisma.phase.findUnique({
      where: {
        uuid,
      },
    });

    if (!phase) {
      this.logger.warn(`Phase with uuid ${uuid} not found`);
      throw new RpcException(`Phase with uuid ${uuid} not found`);
    }

    return phase;
  }

  private async validateUniqueDisbursementMethods(
    riverBasin: string,
    methods: string[],
    excludeUuid?: string,
  ) {
    const existingPhases = await this.prisma.phase.findMany({
      where: {
        riverBasin,
        ...(excludeUuid && { uuid: { not: excludeUuid } }),
      },
    });

    for (const method of methods) {
      const conflict = existingPhases.find((phase) => {
        const config = phase.disbursementConfig as {
          disbursementMethods?: string[];
        } | null;
        return config?.disbursementMethods?.includes(method);
      });

      if (conflict) {
        this.logger.warn(
          `Disbursement method "${method}" already assigned to phase "${conflict.name}" (${conflict.activeYear}) for riverBasin ${riverBasin}`,
        );
        throw new RpcException(
          `Disbursement method "${method}" is already assigned to phase "${conflict.name}" (${conflict.activeYear}) for riverBasin ${riverBasin}. Each method can only be used by one phase per project.`,
        );
      }
    }
  }

  async delete(uuid: string) {
    this.logger.log(`Deleting phase with uuid: ${uuid}`);

    const phase = await this.findOrThrow(uuid);

    if (phase.isActive) {
      this.logger.warn(`Cannot delete an active phase: ${uuid}`);
      throw new RpcException('Cannot delete an active phase');
    }

    const [triggerCount, activityCount] = await Promise.all([
      this.prisma.trigger.count({
        where: {
          phaseId: uuid,
          isDeleted: false,
        },
      }),
      this.prisma.activity.count({
        where: {
          phaseId: uuid,
          isDeleted: false,
        },
      }),
    ]);

    if (triggerCount > 0) {
      this.logger.warn(
        `Cannot delete phase ${uuid}: ${triggerCount} trigger(s) are associated with this phase`,
      );
      throw new RpcException(
        `Cannot delete phase "${phase.name}" (${phase.activeYear}): ${triggerCount} trigger(s) are associated with it. Please remove them first.`,
      );
    }

    if (activityCount > 0) {
      this.logger.warn(
        `Cannot delete phase ${uuid}: ${activityCount} activity(s) are associated with this phase`,
      );
      throw new RpcException(
        `Cannot delete phase "${phase.name}" (${phase.activeYear}): ${activityCount} activity(s) are associated with it. Please remove them first.`,
      );
    }

    try {
      return await this.prisma.phase.delete({
        where: { uuid },
      });
    } catch (error: any) {
      this.logger.error('Error while deleting phase', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async isPayoutPhaseActivated(payload: GetPhaseByLocationDto) {
    this.logger.log(
      `Getting phase payout status for station: ${payload.riverBasin} and active year ${payload.activeYear}`,
    );

    const { activeYear, riverBasin } = payload;
    if (!activeYear || !riverBasin) {
      this.logger.log('activate year and river basing is messing');
      throw new RpcException('messing activeYear and riverBasin');
    }

    const phase = await this.prisma.phase.findMany({
      where: {
        activeYear,
        canTriggerPayout: true,
        isActive: true,
        source: {
          riverBasin: {
            contains: riverBasin,
            mode: 'insensitive',
          },
        },
      },
    });

    if (!phase || !phase.length) {
      return false;
    }

    return true;
  }
  async setExtendedTriggerLogic(payload: SetExtendedTriggerLogicDto) {
    const { uuid, ...extendedTriggerLogic } = payload;
    this.logger.log(
      `Setting extended trigger logic for phase ${uuid} with groupCount=${extendedTriggerLogic.groups?.length ?? 0}`,
    );
    const phase = await this.findOrThrow(uuid);

    if (phase.isActive) {
      this.logger.warn(
        `Cannot set extended trigger logic for active phase ${uuid}`,
      );
      throw new RpcException(
        'Cannot update extended trigger logic on an active phase',
      );
    }

    this.logger.debug(`Persisting extended trigger logic for phase ${uuid}`);
    return this.prisma.phase.update({
      where: { uuid },
      data: {
        extendedTriggerLogic: extendedTriggerLogic as unknown as object,
      },
    });
  }

  async getExtendedTriggerLogic(uuid: string) {
    this.logger.log(`Fetching extended trigger logic for phase ${uuid}`);
    const phase = await this.findOrThrow(uuid);
    return {
      uuid: phase.uuid,
      extendedTriggerLogic: phase.extendedTriggerLogic ?? null,
    };
  }

  async removeExtendedTriggerLogic(uuid: string) {
    this.logger.log(`Removing extended trigger logic for phase ${uuid}`);
    const phase = await this.findOrThrow(uuid);

    if (phase.isActive) {
      this.logger.warn(
        `Cannot remove extended trigger logic for active phase ${uuid}`,
      );
      throw new RpcException(
        'Cannot remove extended trigger logic from an active phase',
      );
    }

    return this.prisma.phase.update({
      where: { uuid },
      data: {
        extendedTriggerLogic: null,
      },
    });
  }
}
