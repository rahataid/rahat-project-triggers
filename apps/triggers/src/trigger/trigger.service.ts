import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ActivateTriggerPayloadDto,
  CreateTriggerDto,
  CreateTriggerPayloadDto,
  findOneTriggerDto,
  GetTriggersDto,
  RemoveTriggerPayloadDto,
  UpdateTriggerPayloadDto,
  UpdateTriggerTransactionDto,
} from './dto';
import {
  paginator,
  PaginatorTypes,
  PrismaService,
  DataSource,
  Prisma,
} from '@lib/database';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, CORE_MODULE, EVENTS, JOBS } from 'src/constant';
import type { Queue } from 'bull';
import { PhasesService } from 'src/phases/phases.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AddTriggerJobDto, UpdateTriggerParamsJobDto } from 'src/common/dto';
import { catchError, lastValueFrom, of, timeout } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { triggerPayloadSchema } from './validation/trigger.schema';
import { TRIGGER_CONSTANTS } from './trigger.constants';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class TriggerService {
  logger = new Logger(TriggerService.name);
  constructor(
    @Inject(CORE_MODULE) private readonly client: ClientProxy,
    private prisma: PrismaService,
    @Inject(forwardRef(() => PhasesService))
    private readonly phasesService: PhasesService,
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
    @InjectQueue(BQUEUE.TRIGGER) private readonly triggerQueue: Queue,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(payload: CreateTriggerPayloadDto) {
    const { user, appId, triggers } = payload;

    if (!appId) {
      throw new BadRequestException('appId is required');
    }

    try {
<<<<<<< HEAD:src/trigger/trigger.service.ts
      /*
      We don't need to create a trigger sperately if source is manual, because,
      we are creating a trigger in the phase itself. and phase is linked with datasource
      */

      let trigger = null;

      if (dto.source === 'MANUAL') {
        this.logger.log(
          `User requested MANUAL Trigger, So creating manul trigger`,
        );
        delete dto.triggerDocuments?.type;
        trigger = await this.createManualTrigger(appId, dto, createdBy);
      } else {
        const sanitizedPayload = {
          title: dto.title,
          description: dto.description,
          triggerStatement: dto.triggerStatement,
          phaseId: dto.phaseId,
          isMandatory: dto.isMandatory,
          dataSource: dto.source,
          riverBasin: dto.riverBasin,
          repeatEvery: '30000',
          notes: dto.notes,
          createdBy,
        };
        trigger = await this.scheduleJob(sanitizedPayload);
      }

      // const queueData: AddTriggerJobDto = {
      //   id: trigger.uuid,
      //   trigger_type: trigger.isMandatory ? 'MANDATORY' : 'OPTIONAL',
      //   phase: trigger.phase.name,
      //   title: trigger.title,
      //   description: trigger.description,
      //   source: trigger.source,
      //   river_basin: trigger.phase.riverBasin,
      //   params: JSON.parse(JSON.stringify(trigger.triggerStatement)),
      //   is_mandatory: trigger.isMandatory,
      //   notes: trigger.notes,
      // };

      // TODO: temp fix to test
      // const res = await lastValueFrom(
      //   this.client.send(
      //     { cmd: JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE, uuid: appId },
      //     { triggers: [queueData] },
      //   ),
      // );

      // this.logger.log(`
      //   Trigger added to stellar queue action: ${res?.name} with id: ${queueData.id} for AA ${appId}
      //   `);
=======
      const triggersData = await Promise.all(
        triggers.map((item) => this.createTriggerItem(appId, item, user?.name)),
      );

      const queueData: AddTriggerJobDto[] = triggersData.map((trigger) =>
        this.buildAddTriggerJobDto(trigger),
      );
>>>>>>> dev:apps/triggers/src/trigger/trigger.service.ts

      const res = await this.sendAddTriggerToOnChain(appId, queueData);

      this.logger.log(`
        Total ${triggersData.length} triggers added for action: ${res?.name} to stellar queue for AA ${appId}
        `);
      return triggersData;
    } catch (error: any) {
      this.logger.error(`Error in create triggers for app ${appId}:`, error);
      throw new RpcException(error.message);
    }
  }

  private async createTriggerItem(
    appId: string,
    dto: CreateTriggerDto,
    createdBy: string,
  ) {
    if (dto.source === DataSource.MANUAL) {
      this.logger.log(
        `User requested MANUAL Trigger, So creating manual trigger`,
      );
      // const dtoCopy = { ...dto };
      // delete dtoCopy.triggerDocuments?.type;
      return await this.createTrigger(appId, dto, createdBy);
    }

    const result = triggerPayloadSchema.safeParse(dto);
    if (!result.success) {
      this.logger.warn(
        `Invalid trigger payload: ${JSON.stringify(result.error.flatten())}`,
      );
      throw new BadRequestException({
        message: `Invalid trigger payload: ${JSON.stringify(result.error.flatten())}`,
      });
<<<<<<< HEAD:src/trigger/trigger.service.ts

      // TODO: temp fix to test
      // const res = await lastValueFrom(
      //   this.client.send(
      //     { cmd: JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE, uuid: appId },
      //     { triggers: queueData },
      //   ),
      // );

      // this.logger.log(`
      //   Total ${k.length} triggers added for action: ${res?.name} to stellar queue for AA ${appId}
      //   `);
      return k;
    } catch (error) {
      console.log(error);
      throw new RpcException(error.message);
=======
>>>>>>> dev:apps/triggers/src/trigger/trigger.service.ts
    }

    return await this.createTrigger(appId, dto, createdBy);
  }

  async updateTransaction(payload: UpdateTriggerTransactionDto) {
    const { uuid, transactionHash } = payload;
    this.logger.log(
      `Updating trigger transaction hash on trigger with uuid: ${uuid}`,
    );

    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          uuid,
        },
      });

      if (!trigger) {
        this.logger.warn('Trigger not found.');
        throw new RpcException('Trigger not found.');
      }

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          uuid,
        },
        data: {
          transactionHash,
        },
      });

      return updatedTrigger;
    } catch (error: any) {
      this.logger.error(
        `Error in updating trigger transaction hash on trigger with uuid: ${uuid}:`,
        error,
      );
      throw new RpcException(error.message);
    }
  }

  async update(payload: UpdateTriggerPayloadDto) {
    const { uuid, appId, ...dto } = payload;

    this.logger.log(`Updating trigger with uuid: ${uuid}`);

    if (!uuid) {
      throw new BadRequestException('uuid is required');
    }
    if (!appId) {
      throw new BadRequestException('appId is required');
    }

    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          uuid: uuid,
        },
      });

      if (!trigger) {
        this.logger.warn('Trigger not found.');
        throw new RpcException('Trigger not found.');
      }

      if (trigger.isTriggered) {
        this.logger.warn(
          'Trigger has already been activated. Cannot update an activated trigger.',
        );
        throw new RpcException('Trigger has already been activated.');
      }

      const fields = {
        title: dto.title || trigger.title,
        triggerStatement: dto.triggerStatement || trigger.triggerStatement,
        notes: dto.notes ?? trigger.notes,
        description: dto.description ?? trigger.description,
        isMandatory: dto.isMandatory ?? trigger.isMandatory,
      };

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          uuid: uuid,
        },
        data: {
          ...fields,
        },
      });

      const queueData = this.buildUpdateTriggerParamsJobDto(updatedTrigger);

<<<<<<< HEAD:src/trigger/trigger.service.ts
      // TODO: temp fix to test
      // const res = await lastValueFrom(
      //   this.client.send(
      //     {
      //       cmd: JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE,
      //       uuid: appId,
      //     },
      //     {
      //       trigger: queueData,
      //     },
      //   ),
      // );
=======
      const res = await this.sendUpdateTriggerToOnChain(appId, queueData);
>>>>>>> dev:apps/triggers/src/trigger/trigger.service.ts

      // this.logger.log(`
      //   Trigger added to stellar queue with id: ${res?.name} for AA ${appId}
      //   `);
      return updatedTrigger;
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async getAll(payload: GetTriggersDto) {
    this.logger.log(`Getting all triggers for app`, payload);
    try {
      const { riverBasin, activeYear, ...dto } = payload;

      // if (!riverBasin || !activeYear) {
      //   this.logger.warn('riverBasin or activeYear not provided');
      //   throw new RpcException('riverBasin or activeYear not provided');
      // }

      return paginate(
        this.prisma.trigger,
        {
          where: {
            isDeleted: false,
            phase: {
              ...(activeYear && { activeYear }),
              ...(riverBasin && {
                riverBasin: {
                  contains: riverBasin,
                  mode: 'insensitive',
                },
              }),
            },
          },
          include: {
            phase: {
              include: {
                source: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        {
          page: dto.page,
          perPage: dto.perPage,
        },
      );
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async findOne(payload: findOneTriggerDto) {
    const { uuid } = payload;
    this.logger.log(`Getting trigger with uuid: ${uuid}`);
    try {
      return await this.prisma.trigger.findUnique({
        where: {
          uuid,
        },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(error.message);
      throw new RpcException(error.message);
    }
  }

  async createTrigger(appId: string, dto: CreateTriggerDto, createdBy: string) {
    this.logger.log(`Creating ${dto.source} trigger for app: ${appId}`);
    try {
      const { phaseId, ...rest } = dto;
      const phase = await this.phasesService.getOne(phaseId);

      if (!phase) {
        this.logger.error(`Phase with id: ${phaseId} not found.`);
        throw new RpcException(`Phase with id: ${phaseId} not found.`);
      }

      const payload = {
        ...rest,
        phase: {
          connect: {
            uuid: phaseId,
          },
        },
        source: dto.source,
        isDeleted: false,
        repeatKey: randomUUID(),
        createdBy,
      };

      const trigger = await this.prisma.trigger.create({
        data: payload,
        include: {
          phase: true,
        },
      });

      return trigger;
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async remove(payload: RemoveTriggerPayloadDto) {
    const { uuid } = payload;

    this.logger.log(`Removing trigger with uuid: ${uuid}`);

    if (!uuid) {
      throw new BadRequestException('Uuid is required');
    }

    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          uuid: uuid,
          isDeleted: false,
        },
        include: { phase: true },
      });

      if (!trigger) {
        this.logger.error(`Trigger with id: ${uuid} not found.`);
        throw new RpcException(`Trigger with id: ${uuid} not found.`);
      }

      if (trigger.isTriggered) {
        this.logger.error(
          `Trigger with id: ${uuid} is activated. Cannot remove an activated trigger.`,
        );
        throw new RpcException(`Cannot remove an activated trigger.`);
      }

      if (trigger.phase.isActive) {
        this.logger.error(
          `Trigger with id: ${uuid} is in an active phase. Cannot remove triggers from an active phase.`,
        );
        throw new RpcException(`Cannot remove triggers from an active phase.`);
      }

      const phaseDetail = await this.phasesService.getOne(trigger.phaseId);

      // check if optional triggers criterias are disrupted
      if (!trigger.isMandatory) {
        const totalTriggersAfterDeleting =
          Number(
            phaseDetail.triggerRequirements.optionalTriggers.totalTriggers,
          ) - 1;
        if (totalTriggersAfterDeleting < phaseDetail.requiredOptionalTriggers) {
          throw new RpcException(`Trigger criterias disrupted.`);
        }
      }

      // if(trigger.isMandatory){
      //   const totalTriggersAfterDeleting = Number(phaseDetail.triggerRequirements.mandatoryTriggers.totalTriggers) - 1
      //   if(totalTriggersAfterDeleting<phaseDetail.requiredMandatoryTriggers) {
      //     throw new RpcException('Trigger criterias disrupted.')
      //   }
      // }

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          uuid,
        },
        data: {
          isDeleted: true,
        },
      });

      return updatedTrigger;
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async activeAutomatedTriggers(ids: string[]) {
    try {
      const triggerWhereArgs: Prisma.TriggerWhereInput = {
        uuid: {
          in: ids,
        },
        source: {
          not: DataSource.MANUAL,
        },
        isTriggered: false,
        isDeleted: false,
      };

      const triggers = await this.prisma.trigger.findMany({
        where: triggerWhereArgs,
      });

      if (triggers.length !== ids.length) {
        const notfoundTriggers = ids.filter(
          (id) => !triggers.some((trigger) => trigger.uuid === id),
        );
        this.logger.warn(
          `Some triggers not found to activate: ${notfoundTriggers.join(', ')}`,
        );
      }

      const phases: Record<
        string,
        { mandatoryTriggers: number; optionalTriggers: number }
      > = triggers.reduce((acc, trigger) => {
        if (!acc[trigger.phaseId as string]) {
          acc[trigger.phaseId] = {
            mandatoryTriggers: 0,
            optionalTriggers: 0,
          };
        }

        if (trigger.isMandatory) {
          acc[trigger.phaseId].mandatoryTriggers++;
        } else {
          acc[trigger.phaseId].optionalTriggers++;
        }

        return acc;
      }, {});

      const updatedTriggers = await this.prisma.trigger.updateMany({
        where: triggerWhereArgs,
        data: {
          isTriggered: true,
          triggeredAt: new Date(),
          triggeredBy: 'System',
        },
      });

      this.logger.log(`Total ${updatedTriggers.count} triggers updated`);

      for (const phaseId in phases) {
        await this.prisma.phase.update({
          where: {
            uuid: phaseId,
          },
          data: {
            receivedMandatoryTriggers: {
              increment: phases[phaseId].mandatoryTriggers,
            },
            receivedOptionalTriggers: {
              increment: phases[phaseId].optionalTriggers,
            },
          },
        });
      }

      const jobs = triggers.map((trigger) => ({
        name: JOBS.TRIGGER.REACHED_THRESHOLD,
        data: trigger,
        opts: {
          attempts: 3,
          removeOnComplete: true,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }));

      this.logger.log(
        `Total ${jobs.length} triggers added to trigger threshold queue`,
      );

      this.triggerQueue.addBulk(jobs);

      // TODO: Need to think about onchain queue update

      for (const phaseId in phases) {
        const phase = await this.prisma.phase.findUnique({
          where: {
            uuid: phaseId,
          },
        });

        this.eventEmitter.emit(EVENTS.NOTIFICATION.CREATE, {
          payload: {
            title: `Trigger Statement Met for ${phase.riverBasin}`,
            description: `The trigger condition has been met for phase ${phase.name}, year ${phase.activeYear}, in the ${phase.riverBasin} river basin.`,
            group: 'Trigger Statement',
            notify: true,
          },
        });
      }
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async activateTrigger(data: ActivateTriggerPayloadDto) {
    const { uuid, appId, ...payload } = data;
    this.logger.log(`Activating trigger with uuid: ${uuid}`);

    if (!uuid) {
      throw new BadRequestException('uuid is required');
    }

    try {
      const { triggerDocuments, user } = payload;
      this.logger.debug(
        `Activating trigger with payload: ${JSON.stringify(payload)}`,
      );

      const trigger = await this.prisma.trigger.findUnique({
        where: {
          uuid,
        },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });

      if (!trigger) {
        this.logger.warn('Trigger not found.');
        throw new RpcException('Trigger not found.');
      }

      if (trigger.isTriggered) {
        this.logger.warn('Trigger has already been activated.');
        throw new RpcException('Trigger has already been activated.');
      }

      if (trigger.source !== DataSource.MANUAL) {
        this.logger.warn('Cannot activate an automated trigger.');
        throw new RpcException('Cannot activate an automated trigger.');
      }

      const triggerDocs = triggerDocuments?.length
        ? triggerDocuments
        : trigger?.triggerDocuments || [];

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          uuid: trigger.uuid,
        },
        data: {
          isTriggered: true,
          triggeredAt: new Date(),
          triggerDocuments: JSON.parse(JSON.stringify(triggerDocs)),
          notes: payload?.notes || '',
          triggeredBy: user?.name,
        },
        include: {
          phase: true,
        },
      });

      const jobDetails = this.buildUpdateTriggerParamsJobDto(updatedTrigger);

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

      // TODO: EVM Change
      this.triggerQueue.add(JOBS.TRIGGER.REACHED_THRESHOLD, trigger, {
        attempts: 3,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      this.logger.log(`
        Trigger added to trigger queue with id: ${trigger.uuid}, action: ${JOBS.TRIGGER.REACHED_THRESHOLD} for appId ${appId}
        `);

      const phaseId = updatedTrigger.phaseId;
      const appIds = await this.prisma.activity.findFirst({
        where: {
          phaseId,
        },
      });

      if (!appId && !appIds?.app) {
        this.logger.warn(
          'No appId or appIds found. Skipping stellar onChain queue update and notification creation.',
        );

        return updatedTrigger;
      }

<<<<<<< HEAD:src/trigger/trigger.service.ts
      // TODO: temp fix to test
      // const res = await lastValueFrom(
      //   this.client.send(
      //     {
      //       cmd: JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE,
      //       uuid: appId ? appId : appIds?.app,
      //     },
      //     {
      //       trigger: jobDetails,
      //     },
      //   ),
      // );
=======
      const res = await this.sendUpdateTriggerToOnChain(
        appId ? appId : appIds?.app,
        jobDetails,
      );
>>>>>>> dev:apps/triggers/src/trigger/trigger.service.ts

      // this.logger.log(`
      //   Trigger added to stellar queue with id: ${jobDetails.id}, action: ${res?.name} for appId ${appId}
      //   `);

      this.eventEmitter.emit(EVENTS.NOTIFICATION.CREATE, {
        payload: {
          title: `Trigger Statement Met for ${updatedTrigger.phase.riverBasin}`,
          description: `The trigger condition has been met for phase ${updatedTrigger.phase.name}, year ${updatedTrigger.phase.activeYear}, in the ${updatedTrigger.phase.riverBasin} river basin.`,
          group: 'Trigger Statement',
          notify: true,
        },
      });

      return updatedTrigger;
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async archive(repeatKey: string) {
    this.logger.log(`Archiving trigger with repeatKey: ${repeatKey}`);
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          repeatKey: repeatKey,
          isDeleted: false,
        },
      });

      if (!trigger) {
        this.logger.warn(`Active trigger with id: ${repeatKey} not found.`);
        throw new RpcException(
          `Active trigger with id: ${repeatKey} not found.`,
        );
      }

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          repeatKey: repeatKey,
        },
        data: {
          isDeleted: true,
        },
      });

      return updatedTrigger;
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async findByLocation(payload) {
    try {
      const { riverBasin, ...dto } = payload;
      return paginate(
        this.prisma.trigger,
        {
          where: {
            isDeleted: false,
            ...(riverBasin && {
              phase: {
                source: {
                  riverBasin: {
                    contains: riverBasin,
                    mode: 'insensitive',
                  },
                },
              },
            }),
          },
          include: {
            phase: {
              include: {
                source: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        {
          page: dto.page,
          perPage: dto.perPage,
        },
      );
      // return this.prisma.trigger.findMany({
      //   where: {
      //     app: appId,
      //     location: {
      //       contains: location,
      //       mode: 'insensitive',
      //     },
      //   },
      // });
    } catch (error: any) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async findTriggersBySourceAndIndicator(
    source: DataSource,
    indicator: string,
  ) {
    return this.prisma.trigger.findMany({
      where: {
        source,
        isTriggered: false,
        isDeleted: false,
        triggerStatement: {
          path: ['source'],
          equals: indicator,
        },
      },
      include: {
        phase: true,
      },
    });
  }

  private buildAddTriggerJobDto(trigger: any): AddTriggerJobDto {
    return {
      id: trigger.uuid,
      trigger_type: trigger.isMandatory ? 'MANDATORY' : 'OPTIONAL',
      phase: trigger.phase.name,
      title: trigger.title,
      description: trigger.description,
      source: trigger.source,
      river_basin: trigger.phase.riverBasin,
      params: JSON.parse(JSON.stringify(trigger.triggerStatement)),
      is_mandatory: trigger.isMandatory,
      notes: trigger.notes,
    };
  }

  private buildUpdateTriggerParamsJobDto(
    trigger: any,
  ): UpdateTriggerParamsJobDto {
    return {
      id: trigger.uuid,
      isTriggered: trigger.isTriggered,
      params: JSON.parse(JSON.stringify(trigger.triggerStatement)),
      source: trigger.source,
    };
  }

  private async sendAddTriggerToOnChain(
    appId: string,
    triggers: AddTriggerJobDto[],
  ): Promise<any> {
    const timeoutMs =
      triggers.length > 1
        ? TRIGGER_CONSTANTS.MICROSERVICE_TIMEOUT_LONG_MS
        : TRIGGER_CONSTANTS.MICROSERVICE_TIMEOUT_SHORT_MS;

    return lastValueFrom(
      this.client
        .send(
          { cmd: JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE, uuid: appId },
          { triggers },
        )
        .pipe(
          timeout(timeoutMs),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              this.logger.error(
                `Error while adding trigger onChain, action ${JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE} for AA ${appId}, timeout in ${timeoutMs}ms`,
              );
              return of(null);
            }

            this.logger.error(
              `Error while adding trigger onChain. Action ${JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE} for AA ${appId}, error: ${error.message}`,
            );

            return of(null);
          }),
        ),
    );
  }

  private async sendUpdateTriggerToOnChain(
    appId: string,
    trigger: UpdateTriggerParamsJobDto,
  ): Promise<any> {
    return lastValueFrom(
      this.client
        .send(
          {
            cmd: JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE,
            uuid: appId,
          },
          {
            trigger,
          },
        )
        .pipe(
          timeout(TRIGGER_CONSTANTS.MICROSERVICE_TIMEOUT_LONG_MS),
          catchError((error) => {
            this.logger.error(
              `Microservice call failed for update trigger onChain:`,
              error,
            );
            throw error;
          }),
        ),
    ).catch((error) => {
      this.logger.error(
        `Microservice call failed for update trigger onChain queue:`,
        error,
      );
      throw error;
    });
  }
}
