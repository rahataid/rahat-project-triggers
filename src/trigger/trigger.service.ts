import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateTriggerDto, GetTriggersDto, UpdateTriggerDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { DataSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, JOBS } from 'src/constant';
import { Queue } from 'bull';
import { PhasesService } from 'src/phases/phases.service';
import { RpcException } from '@nestjs/microservices';
import { AddTriggerJobDto, UpdateTriggerParamsJobDto } from 'src/common/dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class TriggerService {
  logger = new Logger(TriggerService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PhasesService))
    private readonly phasesService: PhasesService,
    @InjectQueue(BQUEUE.SCHEDULE) private readonly scheduleQueue: Queue,
    @InjectQueue(BQUEUE.TRIGGER) private readonly triggerQueue: Queue,
    @InjectQueue(BQUEUE.STELLAR)
    private readonly stellarQueue: Queue<
      { triggers: AddTriggerJobDto[] } | UpdateTriggerParamsJobDto
    >,
  ) {}

  async create(appId: string, dto: CreateTriggerDto) {
    this.logger.log(`Creating trigger for app: ${appId}`);
    try {
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
        trigger = await this.createManualTrigger(appId, dto);
      } else {
        const sanitizedPayload = {
          title: dto.title,
          triggerStatement: dto.triggerStatement,
          phaseId: dto.phaseId,
          isMandatory: dto.isMandatory,
          dataSource: dto.source,
          riverBasin: dto.riverBasin,
          repeatEvery: '30000',
          notes: dto.notes,
        };
        trigger = await this.scheduleJob(sanitizedPayload);
      }

      const queueData: AddTriggerJobDto = {
        id: trigger.uuid,
        trigger_type: trigger.isMandatory ? 'MANDATORY' : 'OPTIONAL',
        phase: trigger.phase.name,
        title: trigger.title,
        source: trigger.source,
        river_basin: trigger.phase.riverBasin,
        params: JSON.parse(JSON.stringify(trigger.triggerStatement)),
        is_mandatory: trigger.isMandatory,
        notes: trigger.notes,
      };

      this.stellarQueue.add(
        JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE(appId),
        {
          triggers: [queueData],
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
      this.logger.log(`
        Trigger added to stellar queue action: ${JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE(appId)} with id: ${queueData.id} for AA ${appId}
        `);

      return trigger;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async bulkCreate(appId: string, payload) {
    try {
      const k = await Promise.all(
        payload.map(async (item) => {
          if (item.source === 'MANUAL') {
            this.logger.log(
              `User requested MANUAL Trigger, So creating manul trigger`,
            );
            return await this.createManualTrigger(payload.appId, item);
          }

          const sanitizedPayload = {
            title: item.title,
            triggerStatement: item.triggerStatement,
            phaseId: item.phaseId,
            isMandatory: item.isMandatory,
            source: item.source,
            riverBasin: item.riverBasin,
            repeatEvery: '30000',
            notes: item.notes,
          };

          return await this.scheduleJob(sanitizedPayload);
        }),
      );
      const queueData: AddTriggerJobDto[] = k.map((trigger) => {
        return {
          id: trigger.uuid,
          trigger_type: trigger.isMandatory ? 'MANDATORY' : 'OPTIONAL',
          phase: trigger.phase.name,
          title: trigger.title,
          source: trigger.source,
          river_basin: trigger.phase.riverBasin,
          params: JSON.parse(JSON.stringify(trigger.triggerStatement)),
          is_mandatory: trigger.isMandatory,
          notes: trigger.notes,
        };
      });

      this.stellarQueue.add(
        JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE(appId),
        {
          triggers: queueData,
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
      this.logger.log(`
        Total ${k.length} triggers added for action: ${JOBS.STELLAR.ADD_ONCHAIN_TRIGGER_QUEUE(appId)} to stellar queue for AA ${appId}
        `);
      return k;
    } catch (error) {
      console.log(error);
    }
  }

  async updateTransaction(uuid: string, transactionHash: string) {
    this.logger.log(`Updating trigger trasaction with uuid: ${uuid}`);

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
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async update(uuid: string, appId: string, payload: UpdateTriggerDto) {
    this.logger.log(`Updating trigger with uuid: ${uuid}`);

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
          'Trigger has already been activated. Connot update, Activated trigger.',
        );
        throw new RpcException('Trigger has already been activated.');
      }

      const fields = {
        title: payload.title || trigger.title,
        triggerStatement: payload.triggerStatement || trigger.triggerStatement,
        notes: payload.notes ?? trigger.notes,
        isMandatory: payload.isMandatory ?? trigger.isMandatory,
      };

      const updatedTrigger = await this.prisma.trigger.update({
        where: {
          uuid: uuid,
        },
        data: {
          ...fields,
        },
      });

      // Add job in queue to update trigger onChain hash
      const queueData: UpdateTriggerParamsJobDto = {
        id: updatedTrigger.uuid,
        isTriggered: updatedTrigger.isTriggered,
        params: JSON.parse(JSON.stringify(updatedTrigger.triggerStatement)),
        source: updatedTrigger.source,
      };

      this.stellarQueue.add(
        JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE(appId),
        queueData,
        {
          attempts: 3,
          removeOnComplete: true,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
      this.logger.log(`
        Trigger added to stellar queue with id: ${queueData.id} for AA ${appId}
        `);
      return updatedTrigger;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async getAll(payload: GetTriggersDto) {
    this.logger.log(`Getting all triggers for app`, payload);
    try {
      const { riverBasin, activeYear, ...dto } = payload;

      if (!riverBasin || !activeYear) {
        this.logger.warn('riverBasin or activeYear not provided');
        throw new RpcException('riverBasin or activeYear not provided');
      }

      return paginate(
        this.prisma.trigger,
        {
          where: {
            isDeleted: false,
            phase: {
              activeYear,
              riverBasin: {
                contains: riverBasin,
                mode: 'insensitive',
              },
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
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async getOne(payload: any) {
    const { repeatKey, uuid } = payload;
    this.logger.log(`Getting trigger with repeatKey: ${repeatKey}`);
    try {
      return await this.prisma.trigger.findFirst({
        where: {
          OR: [{ uuid: uuid }, { repeatKey: repeatKey }],
        },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException(error.message);
    }
  }

  isValidDataSource(value: string): value is DataSource {
    return (Object.values(DataSource) as DataSource[]).includes(
      value as DataSource,
    );
  }

  async createManualTrigger(appId: string, dto: CreateTriggerDto) {
    this.logger.log(`Creating manual trigger for app: ${appId}`);
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
        source: DataSource.MANUAL,
        isDeleted: false,
        repeatKey: randomUUID(),
      };

      const trigger = await this.prisma.trigger.create({
        data: payload,
        include: {
          phase: true,
        },
      });

      return trigger;

      return trigger;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async remove(repeatKey: string) {
    this.logger.log(`Removing trigger with repeatKey: ${repeatKey}`);
    try {
      const trigger = await this.prisma.trigger.findUnique({
        where: {
          repeatKey: repeatKey,
          isDeleted: false,
        },
        include: { phase: true },
      });

      if (!trigger) {
        this.logger.error(`Active trigger with id: ${repeatKey} not found.`);
        throw new RpcException(
          `Active trigger with id: ${repeatKey} not found.`,
        );
      }

      if (trigger.isTriggered) {
        this.logger.error(`Active trigger with id: ${repeatKey} not found.`);
        throw new RpcException(`Cannot remove an activated trigger.`);
      }

      if (trigger.phase.isActive) {
        this.logger.error(`Active trigger with id: ${repeatKey} not found.`);
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
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  private async scheduleJob(payload: any) {
    this.logger.log(
      `Scheduling trigger with payload: ${JSON.stringify(payload)}`,
    );
    try {
      const uuid = randomUUID();
      const { app, source, ...rest } = payload;

      const jobPayload = {
        ...rest,
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
      const { phaseId, ...restJob } = jobPayload;

      const createData = {
        ...restJob,
        repeatKey: repeatableKey,
        phase: {
          connect: {
            uuid: phaseId,
          },
        },
        source,
        isDeleted: false,
      };
      const trigger = await this.prisma.trigger.create({
        data: createData,
        include: {
          phase: true,
        },
      });
      this.logger.log(`Trigger created with repeatKey: ${repeatableKey}`);

      return trigger;
      return trigger;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async activateTrigger(uuid: string, appId: string, payload: any) {
    this.logger.log(`Activating trigger with uuid: ${uuid}`);
    try {
      const { triggeredBy, triggerDocuments, user } = payload;
      console.log('payload', payload);

      const trigger = await this.prisma.trigger.findUnique({
        where: {
          ...(payload?.repeatKey && { repeatKey: payload?.repeatKey }),
          ...(uuid && { uuid: uuid }),
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

      const jobDetails: UpdateTriggerParamsJobDto = {
        id: updatedTrigger.uuid,
        isTriggered: updatedTrigger.isTriggered,
        params: JSON.parse(JSON.stringify(updatedTrigger.triggerStatement)),
        source: updatedTrigger.source,
      };

      this.stellarQueue.add(
        JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE(appId),
        jobDetails,
        {
          attempts: 3,
          removeOnComplete: true,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      this.logger.log(`
        Trigger added to stellar queue with id: ${jobDetails.id}, action: ${JOBS.STELLAR.UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE(appId)} for appId ${appId}
        `);

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

      this.logger.log(`
        Trigger added to trigger queue with id: ${trigger.uuid}, action: ${JOBS.TRIGGER.REACHED_THRESHOLD} for appId ${appId}
        `);

      return updatedTrigger;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }
}
