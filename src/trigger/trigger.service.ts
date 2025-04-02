import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateTriggerDto, GetTriggersDto, UpdateTriggerDto } from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { DataSource, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import { BQUEUE, JOBS } from 'src/constant';
import { Queue } from 'bull';
import { PhasesService } from 'src/phases/phases.service';
import { RpcException } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

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
  ) {}

  async create(appId: string, dto: CreateTriggerDto) {
    this.logger.log(`Creating trigger for app: ${appId}`);
    try {
      /*
      We don't need to create a trigger sperately if source is manual, because,
      we are creating a trigger in the phase itself. and phase is linked with datasource
      */

      if (dto.triggerStatement?.type.toLocaleUpperCase() === 'MANUAL') {
        this.logger.log(
          `User requested MANUAL Trigger, So creating manul trigger`,
        );
        delete dto.triggerDocuments?.type;
        return await this.createManualTrigger(appId, dto);
      }
      const sanitizedPayload = {
        title: dto.title,
        triggerStatement: dto.triggerStatement,
        phaseId: dto.phaseId,
        isMandatory: dto.isMandatory,
        dataSource: dto.dataSource,
        riverBasin: dto.riverBasin,
        repeatEvery: '30000',
      };

      return this.scheduleJob(sanitizedPayload);
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async bulkCreate(payload) {
    try {
      const k = await Promise.all(
        payload.map(async (item) => {
          if (item.triggerStatement?.type.toLocaleUpperCase() === 'MANUAL') {
            this.logger.log(
              `User requested MANUAL Trigger, So creating manul trigger`,
            );
            delete item.triggerStatement?.type;
            return await this.createManualTrigger(payload.appId, item);
          }

          const sanitizedPayload = {
            title: item.title,
            triggerStatement: item.triggerStatement,
            phaseId: item.phaseId,
            isMandatory: item.isMandatory,
            dataSource: item.dataSource,
            riverBasin: item.riverBasin,
            repeatEvery: '30000',
          };

          return await this.scheduleJob(sanitizedPayload);
        }),
      );
      return k;
    } catch (error) {
      console.log(error);
    }
  }
  async getAll(payload: GetTriggersDto) {
    this.logger.log(`Getting all triggers for app`, payload);
    try {
      let { appId, riverBasin, source, phaseId, ...dto } = payload;

      // if we get appid, will search for the source and riverBesin related to that app and featch triggers based on that.
      if ((!source || !riverBasin) && appId) {
        const phase = await this.prisma.phase.findFirst({
          where: {
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

        source = phase?.source.source;
        riverBasin = phase?.source.riverBasin;
      }

      return paginate(
        this.prisma.trigger,
        {
          where: {
            isDeleted: false,
            ...(phaseId && { phaseId: phaseId }),
            ...(source &&
              riverBasin && {
                phase: {
                  source: {
                    source: source,
                    riverBasin: riverBasin,
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
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async getOne(repeatKey: string) {
    this.logger.log(`Getting trigger with repeatKey: ${repeatKey}`);
    try {
      return this.prisma.trigger.findUnique({
        where: {
          repeatKey: repeatKey,
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
      this.logger.error(error);
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
      let { phaseId, ...rest } = dto;
      // find phase
      const phase = await this.phasesService.getOne(phaseId);

      if (!phase) {
        this.logger.error(`Phase with id: ${phaseId} not found.`);
        throw new RpcException(`Phase with id: ${phaseId} not found.`);
      }

      if (phase.source.source !== DataSource.MANUAL) {
        // From ui, we only need phase id for name, river Basin.
        this.logger.log(
          `Provided phase is not a manual phase. So creating a new one`,
        );

        let newPhase;

        // Check manual particular phase exist in the river basin
        const doesManualPhaseExist = await this.phasesService.getPhaseBySource(
          DataSource.MANUAL,
          phase.source.riverBasin,
          phase.name,
        );

        if (doesManualPhaseExist) {
          this.logger.log(`Manual phase already exists`);
          newPhase = doesManualPhaseExist;
        } else {
          // Create new manual phase for the river basin
          newPhase = await this.phasesService.create({
            river_basin: phase.source.riverBasin,
            source: 'MANUAL',
            name: phase.name,
            activeYear: phase.activeYear.toISOString(),
          });
          this.logger.log(`Creating a new manual phase`);
        }

        phaseId = newPhase.uuid;
      }

      // const uuid = randomUUID();

      const payload = {
        ...rest,
        phase: {
          connect: {
            uuid: phaseId,
          },
        },
        isDeleted: false,
        repeatKey: randomUUID(),
      };

      return await this.prisma.trigger.create({
        data: payload,
      });
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
      const { app, ...rest } = payload;
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
        repeatKey: repeatableKey,
        phase: {
          connect: {
            uuid: phaseId,
          },
        },
        ...restJob,
        isDeleted: false,
      };
      await this.prisma.trigger.create({
        data: createData,
      });

      return createData;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException(error.message);
    }
  }

  async activateTrigger(uuid: string, payload: UpdateTriggerDto) {
    this.logger.log(`Activating trigger with uuid: ${uuid}`);
    try {
      const { triggeredBy, triggerDocuments } = payload;

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

      if (trigger.phase.source.source !== DataSource.MANUAL) {
        this.logger.warn('Cannot activate an automated trigger.');
        throw new RpcException('Cannot activate an automated trigger.');
      }

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
            location: {
              contains: location,
              mode: 'insensitive',
            },
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
