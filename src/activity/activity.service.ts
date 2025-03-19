import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ActivityStatus } from '@prisma/client';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { EVENTS, JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import { CreateActivityDto, GetActivityDto, UpdateActivityDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { ActivityCommunicationData, SessionStatus } from 'src/constant/types';
import { randomUUID } from 'crypto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(MS_TRIGGER_CLIENTS.RAHAT) private readonly client: ClientProxy,
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
    try {
      const newActivity = await this.prisma.activity.create({
        data: { ...payload, app: payload.appId },
      });

      this.eventEmitter.emit(EVENTS.ACTIVITY_ADDED, {});
      return newActivity;
    } catch (err) {
      console.log(err);
    }
  }

  async getOne(payload: { uuid: string }) {
    const { uuid } = payload;
    // return this.prisma.activity.findUnique({
    //   where: {
    //     uuid: uuid,
    //   },
    //   include: {
    //     category: true,
    //     phase: true,
    //   },
    // });

    const { activityCommunication: aComm, ...activityData } =
      await this.prisma.activity.findUnique({
        where: {
          uuid: uuid,
        },
        include: {
          category: true,
          phase: true,
        },
      });

    const activityCommunication = [];
    const activityPayout = [];

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
          const sessionDetails = await firstValueFrom(
            this.client.send(
              {
                cmd: JOBS.ACTIVITIES.COMMUNICATION.GET_SESSION,
                uuid: process.env.PROJECT_ID,
              },
              {
                sessionId: communication.sessionId,
              },
            ),
          );
          sessionStatus = sessionDetails.status;
        }
        // const transport = await this.commsClient.transport.get(
        //   communication.transportId,
        // );

        const transport = await firstValueFrom(
          this.client.send(
            {
              cmd: JOBS.ACTIVITIES.COMMUNICATION.GET_TRANSPORT_DETAILS,
              uuid: process.env.PROJECT_ID,
            },
            {
              transportId: communication.transportId,
            },
          ),
        );
        const transportName = transport.data.name;

        const { group, groupName } = await this.getGroupDetails(
          communication.groupType,
          communication.groupId,
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
  }

  async getAll(payload: GetActivityDto) {
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
    } = payload;

    const query = {
      where: {
        isDeleted: false,
        ...(title && { title: { contains: title, mode: 'insensitive' } }),
        ...(category && { categoryId: category }),
        ...(phase && { phaseId: phase }),
        ...(isComplete && { isComplete: isComplete }),
        ...(isApproved && { isApproved: isApproved }),
        ...(responsibility && {
          responsibility: { contains: responsibility, mode: 'insensitive' },
        }),
        ...(status && { status: status }),
      },
      include: {
        category: true,
        phase: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    };

    return paginate(this.prisma.activity, query, {
      page,
      perPage,
    });
  }

  async getHavingComms(payload: GetActivityDto) {
    const { page, perPage } = payload;

    const query = {
      where: {
        isDeleted: false,
        activityCommunication: null,
      },
      include: {
        phase: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    };

    return paginate(this.prisma.activity, query, {
      page,
      perPage,
    });
  }

  async remove(payload: any) {
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
  }

  async updateStatus(payload: {
    uuid: string;
    status: ActivityStatus;
    notes: string;
    activityDocuments: Record<string, string>;
    user: any;
  }) {
    const { status, uuid, notes, activityDocuments, user } = payload;

    const activity = await this.prisma.activity.findUnique({
      where: {
        uuid: uuid,
      },
    });

    const docs = activityDocuments?.length
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
        ...(status === 'COMPLETED' && { completedBy: user?.name }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
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
  }

  async update(payload: UpdateActivityDto) {
    const {
      uuid,
      activityCommunication,
      isAutomated,
      title,
      source,
      responsibility,
      phaseId,
      leadTime,
      description,
      categoryId,
      activityDocuments,
    } = payload;
    const activity = await this.prisma.activity.findUnique({
      where: {
        uuid: uuid,
      },
    });
    if (!activity) throw new RpcException('Activity not found.');

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
        source: source || activity.source,
        responsibility: responsibility || activity.responsibility,
        leadTime: leadTime || activity.leadTime,
        isAutomated: isAutomated,
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
  }

  async getSessionLogs(payload: {
    communicationId: string;
    activityId: string;
  }) {
    const { communicationId, activityId } = payload;

    const { selectedCommunication } =
      await this.getActivityCommunicationDetails(communicationId, activityId);

    const { groupName } = await this.getGroupDetails(
      selectedCommunication.groupType,
      selectedCommunication.groupId,
    );

    const sessionDetails = await firstValueFrom(
      this.client.send(
        {
          cmd: JOBS.ACTIVITIES.COMMUNICATION.GET_SESSION,
          uuid: process.env.PROJECT_ID,
        },
        {
          sessionId: selectedCommunication.sessionId,
        },
      ),
    );
    const { addresses, ...rest } = sessionDetails;

    return {
      sessionDetails: rest,
      communicationDetail: selectedCommunication,
      groupName,
    };
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
    const activity = await this.prisma.activity.findUnique({
      where: {
        uuid: activityId,
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
      sessionId?: string;
    }>;

    const selectedCommunication = parsedCommunications.find(
      (c) => c?.communicationId === communicationId,
    );

    if (!Object.keys(selectedCommunication).length)
      throw new RpcException('Selected communication not found.');

    return { selectedCommunication, activity };
  }

  async getGroupDetails(
    groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
    groupId: string,
  ) {
    let group: any;
    let groupName: string;
    if (groupType === 'STAKEHOLDERS') {
      group = await firstValueFrom(
        this.client.send(
          {
            cmd: JOBS.STAKEHOLDERS.GET_ONE_GROUP,
            uuid: process.env.PROJECT_ID,
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
            uuid: process.env.PROJECT_ID,
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

    console.log(`Group (${groupType}):`, group);
    return { group, groupName };
  }
  async getCommsStats() {
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
      totalCommsProject,
    };
  }

  // async triggerCommunication(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   const activity = await this.prisma.activity.findUnique({
  //     where: {
  //       uuid: payload.activityId,
  //     },
  //   });
  //   if (!activity) throw new RpcException('Activity communication not found.');
  //   const { activityCommunication } = activity;

  //   const parsedCommunications = JSON.parse(
  //     JSON.stringify(activityCommunication),
  //   ) as Array<{
  //     groupId: string;
  //     message:
  //       | string
  //       | {
  //           mediaURL: string;
  //           fileName: string;
  //         };
  //     groupType: 'STAKEHOLDERS' | 'BENEFICIARY';
  //     transportId: string;
  //     communicationId: string;
  //   }>;

  //   const selectedCommunication = parsedCommunications.find(
  //     (c) => c?.communicationId === payload.communicationId,
  //   );

  //   if (!Object.keys(selectedCommunication).length)
  //     throw new RpcException('Selected communication not found.');

  //   // const transportDetails = await this.commsClient.transport.get(
  //   //   selectedCommunication.transportId,
  //   // );

  //   const transportDetails = await firstValueFrom(
  //     this.client.send(
  //       {
  //         cmd: JOBS.ACTIVITIES.COMMUNICATION.GET_TRANSPORT_DETAILS,
  //         uuid: process.env.PROJECT_ID,
  //       },
  //       {
  //         transportId: selectedCommunication.transportId,
  //       },
  //     ),
  //   );

  //   if (!transportDetails.data)
  //     throw new RpcException('Selected transport not found.');

  //   const addresses = await this.getAddresses(
  //     selectedCommunication.groupType,
  //     selectedCommunication.groupId,
  //     transportDetails.data.validationAddress as ValidationAddress,
  //   );

  //   let messageContent: string;
  //   if (transportDetails.data.type === TransportType.VOICE) {
  //     const msg = selectedCommunication.message as {
  //       mediaURL: string;
  //       fileName: string;
  //     };
  //     messageContent = msg.mediaURL;
  //   } else {
  //     messageContent = selectedCommunication.message as string;
  //   }

  //   /// cva_communication microservice
  //   // const sessionData = await this.commsClient.broadcast.create({
  //   //   addresses: addresses,
  //   //   maxAttempts: 3,
  //   //   message: {
  //   //     content: messageContent,
  //   //     meta: {
  //   //       subject: 'INFO',
  //   //     },
  //   //   },
  //   //   options: {},
  //   //   transport: selectedCommunication.transportId,
  //   //   trigger: TriggerType.IMMEDIATE,
  //   // });
  //   const sessionData = await firstValueFrom(
  //     this.client.send(
  //       {
  //         cmd: JOBS.ACTIVITIES.COMMUNICATION.BROAD_CAST_CREATE,
  //         uuid: process.env.PROJECT_ID,
  //       },
  //       {
  //         uuid: selectedCommunication.communicationId,
  //         // addresses,
  //         // msgContent: messageContent,
  //         // transportId: selectedCommunication.transportId,
  //         // activityTrigger: true,
  //       },
  //     ),
  //   );

  //   console.log('session', sessionData);

  //   const updatedCommunicationsData = parsedCommunications.map((c) => {
  //     if (c?.communicationId === payload.communicationId) {
  //       return {
  //         ...c,
  //         sessionId: sessionData.cuid,
  //       };
  //     }
  //     return c;
  //   });

  //   await this.prisma.activity.update({
  //     where: {
  //       uuid: payload.activityId,
  //     },
  //     data: {
  //       activityCommunication: updatedCommunicationsData,
  //     },
  //   });

  //   return sessionData;
  // }

  // async getAddresses(
  //   groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
  //   groupId: string,
  //   validationAddress: ValidationAddress,
  // ) {
  //   switch (groupType) {
  //     case 'STAKEHOLDERS':
  //       const group = await firstValueFrom(
  //         this.client.send(
  //           {
  //             cmd: JOBS.STAKEHOLDERS.GET_ONE_GROUP,
  //             uuid: process.env.PROJECT_ID,
  //           },
  //           { uuid: groupId },
  //         ),
  //       );
  //       if (!group) throw new RpcException('Stakeholders group not found.');
  //       return group.stakeholders
  //         .map((stakeholder) => {
  //           if (validationAddress === ValidationAddress.EMAIL) {
  //             return stakeholder?.email || null;
  //           } else if (
  //             validationAddress === ValidationAddress.PHONE &&
  //             stakeholder.phone
  //           ) {
  //             return stakeholder.phone.substring(
  //               +stakeholder.phone.length - 10,
  //             );
  //           } else if (validationAddress === ValidationAddress.ANY) {
  //             if (stakeholder.phone) {
  //               return stakeholder.phone
  //                 ? stakeholder.phone.substring(+stakeholder.phone.length - 10)
  //                 : null;
  //             }
  //           }
  //           return null;
  //         })
  //         .filter(Boolean);
  //     case 'BENEFICIARY':
  //       const beneficiaryGroup = await firstValueFrom(
  //         this.client.send(
  //           {
  //             cmd: JOBS.BENEFICIARY.GET_ONE_GROUP,
  //             uuid: process.env.PROJECT_ID,
  //           },
  //           { uuid: groupId },
  //         ),
  //       );
  //       if (!beneficiaryGroup)
  //         throw new RpcException('Beneficiary group not found.');
  //       const groupedBeneficiaries = beneficiaryGroup.groupedBeneficiaries;
  //       return groupedBeneficiaries
  //         ?.map((beneficiary) => {
  //           if (validationAddress === ValidationAddress.EMAIL) {
  //             return beneficiary.Beneficiary?.pii?.email || null;
  //           } else if (
  //             validationAddress === ValidationAddress.PHONE &&
  //             beneficiary.Beneficiary?.pii?.phone
  //           ) {
  //             return beneficiary.Beneficiary?.pii?.phone.substring(
  //               +beneficiary.Beneficiary?.pii?.phone?.length - 10,
  //             );
  //           } else if (validationAddress === ValidationAddress.ANY) {
  //             if (beneficiary.Beneficiary?.pii?.phone) {
  //               return beneficiary.Beneficiary?.pii?.phone
  //                 ? beneficiary.Beneficiary?.pii?.phone.substring(
  //                     +beneficiary.Beneficiary?.pii?.phone.length - 10,
  //                   )
  //                 : null;
  //             }
  //           }
  //           return null;
  //         })
  //         .filter(Boolean);
  //     default:
  //       return [];
  //   }
  // }
}
