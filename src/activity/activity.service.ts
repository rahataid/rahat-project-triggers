import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RpcException } from '@nestjs/microservices';
import { ActivityStatus } from '@prisma/client';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { getTriggerAndActivityCompletionTimeDifference } from 'src/common';
import { EVENTS } from 'src/constant';
import { CreateActivityDto, GetActivityDto, UpdateActivityDto } from './dto';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }
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

  // todo:should work out on this  for throwing the same response as in rahat-project-aa
  async getOne(payload: { uuid: string }) {
    const { uuid } = payload;
    return this.prisma.activity.findUnique({
      where: {
        uuid: uuid,
      },
      include: {
        category: true,
        phase: true,
      },
    });
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

  /*  async triggerCommunication(payload: {
    communicationId: string;
    activityId: string;
  }) {
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
    }>;

    const selectedCommunication = parsedCommunications.find(
      (c) => c?.communicationId === payload.communicationId,
    );

    if (!Object.keys(selectedCommunication).length)
      throw new RpcException('Selected communication not found.');

    const transportDetails = await this.commsClient.transport.get(
      selectedCommunication.transportId,
    );

    if (!transportDetails.data)
      throw new RpcException('Selected transport not found.');

    const addresses = await this.getAddresses(
      selectedCommunication.groupType,
      selectedCommunication.groupId,
      transportDetails.data.validationAddress as ValidationAddress,
    );

    let messageContent: string;
    if (transportDetails.data.type === TransportType.VOICE) {
      const msg = selectedCommunication.message as {
        mediaURL: string;
        fileName: string;
      };
      messageContent = msg.mediaURL;
    } else {
      messageContent = selectedCommunication.message as string;
    }
  */

  /*
    const sessionData = await this.commsClient.broadcast.create({
      addresses: addresses,
      maxAttempts: 3,
      message: {
        content: messageContent,
        meta: {
          subject: 'INFO',
        },
      },
      options: {},
      transport: selectedCommunication.transportId,
      trigger: TriggerType.IMMEDIATE,
    });

    const updatedCommunicationsData = parsedCommunications.map((c) => {
      if (c?.communicationId === payload.communicationId) {
        return {
          ...c,
          sessionId: sessionData.data.cuid,
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

    return sessionData.data;
  }
    */

  // async getAddresses(
  //   groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
  //   groupId: string,
  //   validationAddress: ValidationAddress,
  // ) {
  //   switch (groupType) {
  //     case 'STAKEHOLDERS':
  //       const group = await this.prisma.stakeholdersGroups.findUnique({
  //         where: {
  //           uuid: groupId,
  //         },
  //         include: {
  //           stakeholders: true,
  //         },
  //       });
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
  //       const beneficiaryGroup = await this.beneficiaryService.getOneGroup(
  //         groupId as UUID,
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

    // const updateActivityCommunicationPayload = [];
    // const updateActivityDocuments = activityDocuments?.length
    //   ? JSON.parse(JSON.stringify(activityDocuments))
    //   : [];

    // if (activityCommunication?.length) {
    //   for (const comms of activityCommunication) {
    //     if (comms?.communicationId) {
    //       updateActivityCommunicationPayload.push(comms);
    //     } else {
    //       const communicationId = randomUUID();
    //       updateActivityCommunicationPayload.push({
    //         ...comms,
    //         communicationId,
    //       });
    //     }
    //   }
    // }
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
        activityCommunication,
        activityDocuments,
        updatedAt: new Date(),
      },
    });
  }

  // async getSessionLogs(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   const { communicationId, activityId } = payload;

  //   const { selectedCommunication } =
  //     await this.getActivityCommunicationDetails(communicationId, activityId);

  //   const { groupName } = await this.getGroupDetails(
  //     selectedCommunication.groupType,
  //     selectedCommunication.groupId,
  //   );

  //   const sessionDetails = (
  //     await this.commsClient.session.get(selectedCommunication.sessionId)
  //   ).data;

  //   const { addresses, ...rest } = sessionDetails;

  //   return {
  //     sessionDetails: rest,
  //     communicationDetail: selectedCommunication,
  //     groupName,
  //   };
  // }

  // async retryFailedBroadcast(payload: {
  //   communicationId: string;
  //   activityId: string;
  // }) {
  //   const { communicationId, activityId } = payload;

  //   const { selectedCommunication } =
  //     await this.getActivityCommunicationDetails(communicationId, activityId);

  //   // const retryResponse = (
  //   //   await this.commsClient.session.retryIncomplete(
  //   //     selectedCommunication.sessionId
  //   //   )
  //   // ).data;

  //   // return retryResponse;
  // }

  /*  async getActivityCommunicationDetails(
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
*/

  /*  async getGroupDetails(
    groupType: 'STAKEHOLDERS' | 'BENEFICIARY',
    groupId: string,
  ) {
    let group: any;
    let groupName: string;
    switch (groupType) {
      case 'STAKEHOLDERS':
        group = await this.prisma.stakeholdersGroups.findUnique({
          where: {
            uuid: groupId,
          },
        });
        groupName = group.name;
        break;
      case 'BENEFICIARY':
        group = await this.prisma.beneficiaryGroups.findUnique({
          where: {
            uuid: groupId,
          },
        });
        groupName = group.name;
        break;
      default:
        break;
    }
    return { group, groupName };
  }
    */

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
}
