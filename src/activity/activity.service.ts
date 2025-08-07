import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ActivityStatus, Prisma } from '@prisma/client';
import { TransportType, TriggerType, ValidationAddress } from '@rumsan/connect';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { CommsClient } from 'src/comms/comms.service';
import { EVENTS, JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import { ActivityCommunicationData, SessionStatus } from 'src/constant/types';
import {
  CreateActivityDto,
  GetActivityDto,
  GetActivityHavingCommsDto,
  UpdateActivityDto,
} from './dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class ActivityService {
  logger = new Logger(ActivityService.name);
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(MS_TRIGGER_CLIENTS.RAHAT) private readonly client: ClientProxy,
    @Inject('COMMS_CLIENT')
    private commsClient: CommsClient,
  ) {}
  // create(appId: string, dto: CreateActivityDto) {
  //   return this.prisma.activity.create({
  // data: {
  //   ...dto,
  //   app: appId,
  // },
  //   });
  // }

  // findAll(appId: string, dto: PaginationDto) {
  //   const orderBy: Record<string, 'asc' | 'desc'> = {};
  //   orderBy[dto.sort] = dto.order;
  //   return paginate(
  //     this.prisma.activity,
  //     {
  //       where: {
  //         app: appId,
  //       },
  //       orderBy,
  //     },
  //     {
  //       page: dto.page,
  //       perPage: dto.perPage,
  //     },
  //   );
  // }

  // findOne(uuid: string) {
  //   return this.prisma.activity.findUnique({
  //     where: {
  //       uuid,
  //     },
  //   });
  // }

  // update(uuid: string, dto: UpdateActivityDto) {
  //   return this.prisma.activity.update({
  //     where: {
  //       uuid,
  //     },
  //     data: dto,
  //   });
  // }

  async add(payload: CreateActivityDto) {
    this.logger.log('Adding new activity');
    try {
      const {
        activityCommunication,
        title,
        isAutomated,
        leadTime,
        categoryId,
        description,
        phaseId,
        manager, // < ----- We need responsibility object like name, email from rahat platfrom
        activityDocuments,
        appId,
        activityPayout,
      } = payload;

      const createActivityCommunicationPayload = [];
      const createActivityPayoutPayload = activityPayout || [];
      const docs = activityDocuments || [];

      if (activityCommunication?.length) {
        for (const comms of activityCommunication as any) {
          const communicationId = randomUUID();

          createActivityCommunicationPayload.push({
            ...comms,
            communicationId,
          });
        }
      }

      const newActivity = await this.prisma.activity.create({
        data: {
          title,
          description,
          leadTime,
          isAutomated,
          ...(manager && {
            manager: {
              connectOrCreate: {
                where: {
                  id: manager.id,
                },
                create: {
                  id: manager.id,
                  name: manager.name,
                  email: manager.email,
                  phone: manager.phone,
                },
              },
            },
          }),
          category: {
            connect: { uuid: categoryId },
          },
          phase: {
            connect: { uuid: phaseId },
          },
          activityCommunication: JSON.parse(
            JSON.stringify(createActivityCommunicationPayload),
          ),
          activityPayout: JSON.parse(
            JSON.stringify(createActivityPayoutPayload),
          ),

          activityDocuments: JSON.parse(JSON.stringify(docs)),
          app: appId,
        },
        include: {
          manager: true,
        },
      });

      this.logger.log(`New activity created with uuid: ${newActivity.uuid}`);

      this.eventEmitter.emit(EVENTS.ACTIVITY_ADDED, { appId: appId });

      return newActivity;
    } catch (err) {
      this.logger.error('Something went wrong while adding activity', err);
      throw new RpcException(err?.message || 'Something went wrong');
    }
  }

  // async getOne(payload: { uuid: string; appId: string }) {
  //   const { uuid, appId } = payload;
  //   // return this.prisma.activity.findUnique({
  //   //   where: {
  //   //     uuid: uuid,
  //   //   },
  //   //   include: {
  //   //     category: true,
  //   //     phase: true,
  //   //   },
  //   // });

  //   this.logger.log(`Fetching activity with uuid: ${uuid}`);
  //   try {
  //     const { activityCommunication: aComm, ...activityData } =
  //       await this.prisma.activity.findUnique({
  //         where: {
  //           uuid: uuid,
  //         },
  //         include: {
  //           category: true,
  //           phase: {
  //             include: {
  //               source: true,
  //             },
  //           },
  //           manager: true,
  //         },
  //       });

  //     const activityCommunication = [];
  //     const activityPayout = [];

  //     if (Array.isArray(aComm) && aComm.length) {
  //       for (const comm of aComm) {
  //         const communication = JSON.parse(
  //           JSON.stringify(comm),
  //         ) as ActivityCommunicationData & {
  //           transportId: string;
  //           sessionId: string;
  //         };

  //         let sessionStatus = SessionStatus.NEW;
  //         if (communication.sessionId) {
  //           const sessionDetails = await this.commsClient.session.get(
  //             communication.sessionId,
  //           );
  //           sessionStatus = sessionDetails.data.status;
  //         }
  //         // const transport = await this.commsClient.transport.get(
  //         //   communication.transportId,
  //         // );

  //         const transport = await this.commsClient.transport.get(
  //           communication.transportId,
  //         );
  //         const transportName = transport.data.name;
  //         const { group, groupName } = await this.getGroupDetails(
  //           communication.groupType,
  //           communication.groupId,
  //           appId,
  //         );

  //         activityCommunication.push({
  //           ...communication,
  //           groupName: groupName,
  //           transportName: transportName,
  //           sessionStatus,
  //           ...(communication.sessionId && {
  //             sessionId: communication.sessionId,
  //           }),
  //         });
  //       }
  //     }

  //     return {
  //       ...activityData,
  //       activityCommunication,
  //       activityPayout,
  //     };
  //   } catch (error) {
  //     this.logger.error('Something went wrong while fetching activity', error);
  //     throw new RpcException(error?.message || 'Something went wrong');
  //   }
  // }

  async getOne(payload: { uuid: string; appId: string }) {
    let { uuid, appId } = payload;
    // return this.prisma.activity.findUnique({
    //   where: {
    //     uuid: uuid,
    //   },
    //   include: {
    //     category: true,
    //     phase: true,
    //   },
    // });

    this.logger.log(`Fetching activity with uuid: ${uuid}`);
    try {
      const activityData = await this.prisma.activity.findUnique({
        where: {
          uuid: uuid,
        },
        include: {
          category: true,
          phase: {
            include: {
              source: true,
            },
          },
          manager: true,
        },
      });

      const aComm = activityData?.activityCommunication ?? [];
      const activityCommunication = [];
      const activityPayout = [];
      appId = appId ?? (activityData?.app || null);

      if (Array.isArray(aComm) && aComm.length) {
        for (const comm of aComm) {
          const communication = JSON.parse(
            JSON.stringify(comm),
          ) as ActivityCommunicationData & {
            transportId: string;
            sessionId: string;
          };

          let sessionStatus = SessionStatus.NEW;
          if (communication.sessionId) {
            const sessionDetails = await this.commsClient.session.get(
              communication.sessionId,
            );
            sessionStatus = sessionDetails.data.status;
          }
          // const transport = await this.commsClient.transport.get(
          //   communication.transportId,
          // );

          const transport = await this.commsClient.transport.get(
            communication.transportId,
          );
          const transportName = transport.data.name;

          this.logger.log('Fetching group details for', {
            groupType: communication.groupType,
            groupId: communication.groupId,
            appId,
          });

          const { group, groupName } = await this.getGroupDetails(
            communication.groupType,
            communication.groupId,
            appId,
          );

          activityCommunication.push({
            ...communication,
            groupName: groupName,
            transportName: transportName,
            sessionStatus,
            ...(communication.sessionId && {
              sessionId: communication.sessionId,
            }),
          });
        }
      }

      return {
        ...activityData,
        activityCommunication,
        activityPayout,
      };
    } catch (error) {
      this.logger.error('Something went wrong while fetching activity', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getAll(payload: GetActivityDto) {
    this.logger.log('Fetching all activities', payload);

    const {
      page,
      perPage,
      title,
      category,
      phase,
      isComplete,
      isApproved,
      responsibility, // <---- Responsibility is Activity Manager
      managerId,
      status,
      appId,
      riverBasin,
      isAutomated,
    } = payload;
    try {
      const query = {
        where: {
          app: appId,
          isDeleted: false,
          ...(isAutomated && {
            isAutomated: isAutomated === 'true' ? true : false,
          }),
          ...(title && { title: { contains: title, mode: 'insensitive' } }),
          ...(riverBasin && {
            phase: {
              source: {
                riverBasin,
              },
            },
          }),
          ...(category && { categoryId: category }),
          ...(phase && { phaseId: phase }),
          ...(isComplete && { isComplete: isComplete }),
          ...(isApproved && { isApproved: isApproved }),
          ...(responsibility && {
            manager: {
              name: {
                contains: responsibility,
                mode: 'insensitive',
              },
            },
          }),
          ...(managerId && { managerId: managerId }),
          ...(status && { status: status }),
        },
        include: {
          category: true,
          phase: {
            include: {
              source: true,
            },
          },
          manager: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      };

      return paginate(this.prisma.activity, query, {
        page,
        perPage,
      });
    } catch (error) {
      this.logger.error(
        'Something went wrong while fetching activities',
        error,
      );
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async listProjectSpecific(payload: GetActivityDto) {
    try {
      const {
        page,
        perPage,
        title,
        category,
        phase,
        isComplete,
        isApproved,
        responsibility,
        status,
        appId,
      } = payload;
      this.logger.log(`Fetching all activities for project ${appId}`);

      const query = {
        where: {
          app: appId,
          isDeleted: false,
          ...(title && { title: { contains: title, mode: 'insensitive' } }),
          ...(category && { categoryId: category }),
          ...(phase && { phaseId: phase }),
          ...(isComplete && { isComplete: isComplete }),
          ...(isApproved && { isApproved: isApproved }),
          ...(responsibility && {
            manager: {
              name: {
                contains: responsibility,
                mode: 'insensitive',
              },
            },
          }),
          ...(status && { status: status }),
        },
        include: {
          category: true,
          phase: {
            include: {
              source: true,
            },
          },
          manager: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      };

      return paginate(this.prisma.activity, query, {
        page,
        perPage,
      });
    } catch (error) {
      this.logger.error(
        'Something went wrong while fetching activities',
        error,
      );
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getHavingComms(payload: GetActivityHavingCommsDto) {
    this.logger.log('Fetching activities having communications');
    try {
      const {
        page,
        perPage,
        activeYear,
        appId,
        filters = {},
        riverBasin,
      } = payload;
      const { title, phase, status } = filters;

      const where: Prisma.ActivityWhereInput = {
        isDeleted: false,
        activityCommunication: {
          not: [],
        },
        phase: {
          ...(phase && { name: phase }),
          ...(activeYear && { activeYear }),
          ...(riverBasin && {
            source: {
              riverBasin,
            },
          }),
        },
        app: appId,
        ...(title && {
          title: { contains: title, mode: 'insensitive' },
        }),
        ...(status && { status }),
      };

      const query = {
        where: { ...where },
        include: {
          phase: {
            include: {
              source: true,
            },
          },
          manager: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      };

      const { data: activities, meta } = await paginate(
        this.prisma.activity,
        query,
        {
          page,
          perPage,
        },
      );

      //fetches and updates communication session status for each activity and summarizes the overall status per activity.
      // TODO: Need to implement filtering based on status
      const enhancedData = await Promise.all(
        activities.map(async (activity: any) => {
          const enhancedComms = await Promise.all(
            activity.activityCommunication.map(async (comm) => {
              if (!comm.sessionId) {
                return {
                  ...comm,
                  sessionStatus: 'Not Started',
                };
              }

              try {
                const { data } = await this.commsClient.session.get(
                  comm.sessionId,
                );
                return {
                  ...comm,
                  sessionStatus: data.status,
                };
              } catch (error) {
                this.logger.warn(
                  `Failed to fetch session status for sessionId: ${comm.sessionId}`,
                );
                return {
                  ...comm,
                  sessionStatus: 'WORK IN PROGRESS',
                };
              }
            }),
          );

          let commStatus: string | null;

          if (!enhancedComms.length) {
            commStatus = 'Null';
          } else {
            const allCompleted = enhancedComms.every(
              (comm) => comm.sessionStatus.toLowerCase() === 'completed',
            );

            const isNotStarted = enhancedComms.every(
              (comm) => comm.sessionStatus.toLowerCase() === 'not started',
            );
            commStatus = allCompleted
              ? 'Completed'
              : isNotStarted
                ? 'Not Started'
                : 'Work in Progress';
          }

          return {
            ...activity,
            activityCommunication: enhancedComms,
            commStatus,
          };
        }),
      );

      return {
        data: enhancedData,
        meta,
      };
    } catch (error) {
      this.logger.error(
        `Error while fetching activities having communications`,
        error,
      );

      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async remove(payload: any) {
    this.logger.log(`Deleting activity with uuid: ${payload.uuid}`);
    try {
      const deletedActivity = await this.prisma.activity.update({
        where: {
          uuid: payload.uuid,
        },
        data: {
          isDeleted: true,
        },
      });

      this.eventEmitter.emit(EVENTS.ACTIVITY_DELETED, {});

      return deletedActivity;
    } catch (error) {
      this.logger.error('Error while deleting activity', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async updateStatus(payload: {
    uuid: string;
    status: ActivityStatus;
    notes: string;
    activityDocuments: Record<string, string>;
    user: any;
  }) {
    this.logger.log(`Updating activity status with uuid: ${payload.uuid}`);
    try {
      const { status, uuid, notes, activityDocuments, user } = payload;

      const activity = await this.prisma.activity.findUnique({
        where: {
          uuid: uuid,
        },
      });

      if (!activity) {
        this.logger.warn(`Activity not found: ${uuid}`);
        throw new RpcException(`Activity not found: ${uuid}`);
      }

      const docs = activityDocuments
        ? activityDocuments
        : activity?.activityDocuments || [];

      if (status === 'COMPLETED') {
        this.eventEmitter.emit(EVENTS.ACTIVITY_COMPLETED, {});
      }

      const updatedActivity = await this.prisma.activity.update({
        where: {
          uuid: uuid,
        },
        data: {
          status: status,
          notes: notes,
          activityDocuments: JSON.parse(JSON.stringify(docs)),
          ...(status === 'COMPLETED'
            ? { completedBy: user?.name }
            : { completedBy: null }),
          ...(status === 'COMPLETED'
            ? { completedAt: new Date() }
            : { completedAt: null }),
        },
        include: {
          phase: true,
        },
      });

      if (
        updatedActivity?.status === 'COMPLETED' &&
        !updatedActivity?.differenceInTriggerAndActivityCompletion &&
        updatedActivity?.phase?.activatedAt
      ) {
        const timeDifference = getTriggerAndActivityCompletionTimeDifference(
          updatedActivity.phase.activatedAt,
          updatedActivity.completedAt,
        );

        const finalUpdate = await this.prisma.activity.update({
          where: {
            uuid: uuid,
          },
          data: {
            differenceInTriggerAndActivityCompletion: timeDifference,
          },
        });
        return finalUpdate;
      }

      return updatedActivity;
    } catch (error) {
      this.logger.log('Error while updating activity status', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async update(payload: UpdateActivityDto) {
    this.logger.log(`Updating activity with uuid: ${payload.uuid}`);
    try {
      const {
        uuid,
        activityCommunication,
        isAutomated,
        title,
        phaseId,
        leadTime,
        description,
        manager,
        categoryId,
        activityDocuments,
      } = payload;

      const activity = await this.prisma.activity.findUnique({
        where: {
          uuid: uuid,
        },
      });

      if (!activity) {
        this.logger.warn('Activity not found');
        throw new RpcException('Activity not found.');
      }

      const updateActivityCommunicationPayload = [];
      const updateActivityDocuments = activityDocuments?.length
        ? JSON.parse(JSON.stringify(activityDocuments))
        : [];

      if (activityCommunication?.length) {
        for (const comms of activityCommunication as any) {
          if (comms?.communicationId) {
            updateActivityCommunicationPayload.push(comms);
          } else {
            const communicationId = randomUUID();
            updateActivityCommunicationPayload.push({
              ...comms,
              communicationId,
            });
          }
        }
      }

      return await this.prisma.activity.update({
        where: {
          uuid: uuid,
        },
        data: {
          title: title || activity.title,
          description: description || activity.description,
          leadTime: leadTime || activity.leadTime,
          isAutomated: isAutomated,
          ...(manager && {
            manager: {
              connect: {
                id: manager.id,
              },
              create: {
                id: manager.id,
                name: manager.name,
                email: manager.email,
                phone: manager.phone,
              },
            },
          }),
          phase: {
            connect: {
              uuid: phaseId || activity.phaseId,
            },
          },
          category: {
            connect: {
              uuid: categoryId || activity.categoryId,
            },
          },
          activityCommunication: updateActivityCommunicationPayload,
          activityDocuments: updateActivityDocuments || activityDocuments,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error while updating activity', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getSessionLogs(payload: {
    communicationId: string;
    activityId: string;
    appId: string;
  }) {
    this.logger.log(
      `Getting session logs for communication ${JSON.stringify(payload)}`,
    );
    try {
      const { communicationId, activityId } = payload;

      const { selectedCommunication } =
        await this.getActivityCommunicationDetails(communicationId, activityId);

      const { groupName } = await this.getGroupDetails(
        selectedCommunication.groupType,
        selectedCommunication.groupId,
        payload.appId,
      );

      const { data } = await this.commsClient.session.get(
        selectedCommunication.sessionId,
      );

      if (!data) {
        this.logger.warn('Session not found');
        throw new RpcException('Session not found.');
      }

      const { addresses, ...rest } = data;

      return {
        sessionDetails: rest,
        communicationDetail: selectedCommunication,
        groupName,
      };
    } catch (error) {
      this.logger.error('Error while fetching session logs', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async retryFailedBroadcast(payload: {
    communicationId: string;
    activityId: string;
  }) {
    const { communicationId, activityId } = payload;

    const { selectedCommunication } =
      await this.getActivityCommunicationDetails(communicationId, activityId);

    // const retryResponse = (
    //   await this.commsClient.session.retryIncomplete(
    //     selectedCommunication.sessionId
    //   )
    // ).data;

    // return retryResponse;
  }

  async getActivityCommunicationDetails(
    communicationId: string,
    activityId: string,
  ) {
    this.logger.log(`Fetching activity communication details of ${activityId}`);

    try {
      const activity = await this.prisma.activity.findUnique({
        where: {
          uuid: activityId,
        },
      });

      if (!activity) {
        this.logger.warn('Activity Communication not found');
        throw new RpcException('Activity communication not found.');
      }

      const { activityCommunication } = activity;

      const parsedCommunications = JSON.parse(
        JSON.stringify(activityCommunication),
      ) as Array<{
        groupId: string;
        message:
          | string
          | {
              mediaURL: string;
              fileName: string;
            };
        groupType: 'STAKEHOLDERS' | 'BENEFICIARY';
        transportId: string;
        communicationId: string;
        sessionId?: string;
      }>;

      const selectedCommunication = parsedCommunications.find(
        (c) => c?.communicationId === communicationId,
      );

      if (!selectedCommunication) {
        this.logger.warn(
          "Selected Communication doesn't exist in current activity",
        );
        throw new RpcException(
          "Selected Communication doesn't exist in current activity",
        );
      }

      if (!Object.keys(selectedCommunication).length) {
        throw new RpcException('Selected communication not found.');
      }

      return { selectedCommunication, activity };
    } catch (error) {
      this.logger.error(
        'Error while fetching activity communication details',
        error,
      );
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getGroupDetails(
    groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
    groupId: string,
    appId: string,
  ) {
    this.logger.log(`Fetching group details of ${groupType} ${groupId}`);
    try {
      let group: any;
      let groupName: string;
      if (groupType === 'STAKEHOLDERS') {
        group = await firstValueFrom(
          this.client.send(
            {
              cmd: JOBS.STAKEHOLDERS.GET_ONE_GROUP,
              uuid: appId,
            },
            { uuid: groupId },
          ),
        );
        groupName = group.name;
      } else if (groupType === 'BENEFICIARY') {
        group = await firstValueFrom(
          this.client.send(
            {
              cmd: JOBS.BENEFICIARY.GET_ONE_GROUP,
              uuid: appId,
            },
            { uuid: groupId },
          ),
        );
        groupName = group.name;
      } else {
        throw new Error('Invalid group type');
      }
      if (!group) {
        throw new Error('No response from microservice');
      }

      return { group, groupName };
    } catch (error) {
      this.logger.error('Error while fetching group details', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getCommsStats(appId: string) {
    this.logger.log('Fetching communication stats');
    try {
      const stats = await this.commsClient.broadcast.getReport({
        xref: appId,
      });
      const activitiesHavingComms = await this.prisma.activity.findMany({
        where: {
          isDeleted: false,
          activityCommunication: { not: { equals: [] } },
        },
        select: {
          uuid: true,
          activityCommunication: true,
          title: true,
        },
      });

      let totalCommsProject = 0;

      for (const activity of activitiesHavingComms) {
        for (const comm of JSON.parse(
          JSON.stringify(activity.activityCommunication),
        )) {
          if (comm?.sessionId) {
            totalCommsProject++;
          }
        }
      }

      return {
        stats: stats.data,
        totalCommsProject,
      };
    } catch (error) {
      this.logger.error('Error while fetching communication stats', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async triggerCommunication(payload: {
    communicationId: string;
    activityId: string;
    appId: string;
  }) {
    if (!payload?.communicationId || !payload?.activityId) {
      this.logger.warn('Communication ID or Activity ID is missing');
      throw new RpcException('Communication ID or Activity ID is missing');
    }

    this.logger.log(`Triggering communication for ${payload.activityId}`);
    const activity = await this.prisma.activity.findUnique({
      where: {
        uuid: payload.activityId,
      },
    });
    if (!activity) throw new RpcException('Activity communication not found.');
    const { activityCommunication } = activity;

    const parsedCommunications = JSON.parse(
      JSON.stringify(activityCommunication),
    ) as Array<{
      groupId: string;
      message:
        | string
        | {
            mediaURL: string;
            fileName: string;
          };
      groupType: 'STAKEHOLDERS' | 'BENEFICIARY';
      transportId: string;
      communicationId: string;
      subject: string;
    }>;

    const selectedCommunication = parsedCommunications.find(
      (c) => c?.communicationId === payload.communicationId,
    );

    if (!Object.keys(selectedCommunication).length)
      throw new RpcException('Selected communication not found.');

    const transportDetails = await this.commsClient.transport.get(
      selectedCommunication.transportId,
    );

    if (!transportDetails.data) {
      this.logger.warn('Selected transport not found');
      throw new RpcException('Selected transport not found.');
    }

    const addresses = await this.getAddresses(
      selectedCommunication.groupType,
      selectedCommunication.groupId,
      payload.appId,
      transportDetails.data.validationAddress as ValidationAddress,
    );

    let messageContent: string;
    let messageSubject: string;

    const isVoice = transportDetails.data.type === TransportType.VOICE;
    const isSMTP = transportDetails.data.type === TransportType.SMTP;

    if (isVoice) {
      const msg = selectedCommunication.message as {
        mediaURL: string;
        fileName: string;
      };
      messageSubject = 'INFO';
      messageContent = msg.mediaURL;
    } else {
      messageSubject = isSMTP ? selectedCommunication.subject : 'INFO';
      messageContent = selectedCommunication.message as string;
    }

    /// cva_communication microservice
    const { data: sessionData } = await this.commsClient.broadcast.create({
      addresses: addresses,
      maxAttempts: 3,
      message: {
        content: messageContent,
        meta: {
          subject: messageSubject,
        },
      },
      options: {},
      transport: selectedCommunication.transportId,
      trigger: TriggerType.IMMEDIATE,
      xref: payload.appId,
    });

    if (!sessionData) {
      this.logger.warn('Session not found');
      throw new RpcException('Session not found.');
    }

    const updatedCommunicationsData = parsedCommunications.map((c) => {
      if (c?.communicationId === payload.communicationId) {
        return {
          ...c,
          sessionId: sessionData.cuid,
        };
      }
      return c;
    });

    await this.prisma.activity.update({
      where: {
        uuid: payload.activityId,
      },
      data: {
        activityCommunication: updatedCommunicationsData,
      },
    });

    return sessionData;
  }

  async getAddresses(
    groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
    groupId: string,
    appId: string,
    validationAddress: ValidationAddress,
  ) {
    //  Retrieve the group details (either stakeholder group or beneficiary group)
    const { group } = await this.getGroupDetails(groupType, groupId, appId);

    switch (groupType) {
      case 'STAKEHOLDERS':
        if (!group) throw new RpcException('Stakeholders group not found.');
        //  Extract and validate contact addresses for stakeholders
        return group.stakeholders
          .map((stakeholder) => {
            if (validationAddress === ValidationAddress.EMAIL) {
              return stakeholder?.email || null;
            } else if (
              validationAddress === ValidationAddress.PHONE &&
              stakeholder.phone
            ) {
              // Extract last 10 digits of the phone number

              // return stakeholder.phone.substring(
              //   +stakeholder.phone.length - 10,
              // );
              return stakeholder.phone;
            } else if (validationAddress === ValidationAddress.ANY) {
              // Fallback: use phone number if available
              if (stakeholder.phone) {
                return stakeholder.phone ? stakeholder.phone : null;
              }
            }
            return null;
          })
          .filter(Boolean);
      case 'BENEFICIARY':
        if (!group) throw new RpcException('Beneficiary group not found.');

        const groupedBeneficiaries = group.groupedBeneficiaries;
        //  Extract and validate contact addresses for beneficiaries
        return groupedBeneficiaries
          ?.map((beneficiary) => {
            if (validationAddress === ValidationAddress.EMAIL) {
              return beneficiary.Beneficiary?.pii?.email || null;
            } else if (
              validationAddress === ValidationAddress.PHONE &&
              beneficiary.Beneficiary?.pii?.phone
            ) {
              // Extract last 10 digits of the phone number

              // return beneficiary.Beneficiary?.pii?.phone.substring(
              //   +beneficiary.Beneficiary?.pii?.phone?.length - 10,
              // );
              return beneficiary.Beneficiary?.pii?.phone;
            } else if (validationAddress === ValidationAddress.ANY) {
              // Fallback: use phone number if available
              if (beneficiary.Beneficiary?.pii?.phone) {
                return beneficiary.Beneficiary?.pii?.phone
                  ? beneficiary.Beneficiary?.pii?.phone
                  : null;
              }
            }
            return null;
          })
          .filter(Boolean);
      default:
        return [];
    }
  }

  async getTransportSessionStatsByGroup(appId: string) {
    this.logger.log(`Fetching transport session stats by group`);

    try {
      // Step 1: Fetch all activities with their related communications
      const activities = await this.prisma.activity.findMany({
        where: {
          app: appId,
        },
        select: {
          activityCommunication: true,
        },
      });
      // Step 2: Flatten communication data and extract necessary fields
      const commsToProcess: {
        groupType: string;
        transportId: string;
        sessionId: string;
      }[] = [];

      for (const activity of activities) {
        const comms: any = activity.activityCommunication;
        for (const comm of comms) {
          const { sessionId, groupType, transportId } = comm;
          if (sessionId && groupType && transportId) {
            commsToProcess.push({ sessionId, groupType, transportId });
          }
        }
      }
      // Step 3: Map transportId to its readable transport name using external client
      const transportIdMap = new Map<string, string>();
      const uniqueTransportIds = [
        ...new Set(commsToProcess.map((c) => c.transportId)),
      ];

      const transportResponses = await Promise.all(
        uniqueTransportIds.map((id) => this.commsClient.transport.get(id)),
      );

      transportResponses.forEach((res, idx) => {
        transportIdMap.set(uniqueTransportIds[idx], res.data.name);
      });
      // Step 4: Build a nested structure to group sessionIds by groupType and transportType
      const sessions: Record<string, Record<string, Set<string>>> = {
        BENEFICIARY: {},
        STAKEHOLDERS: {},
      };

      for (const { groupType, transportId, sessionId } of commsToProcess) {
        const group = groupType.toUpperCase();
        const transportType = transportIdMap.get(transportId);
        if (!transportType || !sessions[group]) continue;
        // Group sessionIds under their respective groupType and transport name.
        // Structure: sessions[groupType][transportType] = Set of sessionIds
        if (!sessions[group][transportType]) {
          sessions[group][transportType] = new Set();
        }
        sessions[group][transportType].add(sessionId);
      }
      // Step 5: Initialize result structure and prepare for broadcasting session count requests
      const result: Record<string, Record<string, any>> = {
        beneficiary: {},
        stakeholder: {},
      };

      const resultKeys: { groupKey: string; transportType: string }[] = [];
      const broadcastPromises: Promise<any>[] = [];
      // Step 6: For each group + transport combination, request broadcast stats
      for (const [groupType, transportMap] of Object.entries(sessions)) {
        const groupKey =
          groupType === 'BENEFICIARY' ? 'beneficiary' : 'stakeholder';

        for (const [transportType, sessionSet] of Object.entries(
          transportMap,
        )) {
          const sessionList = Array.from(sessionSet);
          // Enqueue a broadcast count request for each unique transport + group combination
          broadcastPromises.push(
            this.commsClient.session.broadcastCount({
              sessions: sessionList,
            }),
          );
          resultKeys.push({ groupKey, transportType });
        }
      }
      // Step 7: Resolve all broadcast count requests and map the results back
      const broadcastResults = await Promise.all(broadcastPromises);

      broadcastResults.forEach((res, idx) => {
        const { groupKey, transportType } = resultKeys[idx];
        result[groupKey][transportType] = res.data;
      });
      // Final structured output containing session broadcast stats
      return result;
    } catch (error) {
      this.logger.error('Error while fetching group details', error);
      throw new RpcException(error);
    }
  }
}
