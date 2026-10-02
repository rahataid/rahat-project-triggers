import {
  CommunicationTargetStatus,
  paginator,
  PaginatorTypes,
  PrismaService,
} from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { TransportType, TriggerType, ValidationAddress } from '@rumsan/connect';
import { ActivityService } from 'src/activity/activity.service';
import type { CommsClient } from 'src/comms/comms.service';
import {
  CommunicationGroupType,
  CommunicationTargetDto,
  CreateCommunicationDto,
  GetCommunicationDto,
  UpdateCommunicationDto,
} from './dto';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;
const DEFAULT_SORT_FIELD = 'createdAt';

const WRITABLE_FIELDS = [
  'xrefId',
  'title',
  'message',
  'subject',
  'audioURL',
  'transportId',
  'createdBy',
] as const;

const INCLUDE_TARGETS = {
  targets: { orderBy: { id: 'asc' } },
} as const;

// A target in any other state has already been handed to the comms service.
const TRIGGERABLE_STATUSES: CommunicationTargetStatus[] = [
  CommunicationTargetStatus.PENDING,
  CommunicationTargetStatus.FAILED,
];

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('COMMS_CLIENT')
    private readonly commsClient: CommsClient,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Picks only the columns this model owns. Callers reach us over the message
   * bus, which appends its own keys (the platform injects `user` into every
   * payload), and no global ValidationPipe strips them before we get here.
   */
  private toWritableData(
    dto: CreateCommunicationDto | UpdateCommunicationDto,
  ): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of WRITABLE_FIELDS) {
      const value = dto[field];
      if (value !== undefined) data[field] = value;
    }

    if (data.audioURL) data.audioURL = { ...data.audioURL };

    return data;
  }

  /**
   * Keeps only the group identity of each target and drops repeats, which
   * would otherwise violate the (communicationId, groupType, groupId) key.
   */
  private toTargetRows(targets: CommunicationTargetDto[] = []) {
    const rows = new Map<string, { groupId: string; groupType: string }>();

    for (const { groupId, groupType } of targets) {
      rows.set(`${groupType}:${groupId}`, { groupId, groupType });
    }

    return [...rows.values()];
  }

  private getErrorMessage(error: any): string {
    if (error instanceof RpcException) {
      const rpcError: any = error.getError();
      return typeof rpcError === 'string' ? rpcError : rpcError?.message;
    }

    return error?.message || String(error);
  }

  async create(dto: CreateCommunicationDto) {
    this.logger.log(`Creating communication: ${dto.title}`);

    try {
      return await this.prisma.communication.create({
        data: {
          ...(this.toWritableData(dto) as any),
          targets: {
            createMany: { data: this.toTargetRows(dto.targets) },
          },
        },
        include: INCLUDE_TARGETS,
      });
    } catch (error: any) {
      this.logger.error('Failed to create communication', error);
      throw new RpcException(
        error?.message || 'Failed to create communication',
      );
    }
  }

  async findAll(dto: GetCommunicationDto) {
    const {
      title,
      xrefId,
      groupId,
      groupType,
      transportId,
      sessionId,
      status,
      page = 1,
      perPage = 10,
      sort = DEFAULT_SORT_FIELD,
      order = 'desc',
    } = dto || {};

    const sortField = SORTABLE_FIELDS.includes(sort as any)
      ? sort
      : DEFAULT_SORT_FIELD;

    const targetFilter = {
      ...(groupId && { groupId }),
      ...(groupType && { groupType }),
      ...(sessionId && { sessionId }),
      ...(status && { status }),
    };

    const query = {
      where: {
        isDeleted: false,
        ...(title && { title: { contains: title, mode: 'insensitive' } }),
        ...(xrefId && { xrefId }),
        ...(transportId && { transportId }),
        ...(Object.keys(targetFilter).length && {
          targets: { some: targetFilter },
        }),
      },
      include: INCLUDE_TARGETS,
      orderBy: {
        [sortField]: order,
      },
    };

    try {
      return await paginate(this.prisma.communication, query, {
        page,
        perPage,
      });
    } catch (error: any) {
      this.logger.error('Failed to list communications', error);
      throw new RpcException(error?.message || 'Failed to list communications');
    }
  }

  async findOne(uuid: string) {
    const communication = await this.prisma.communication.findFirst({
      where: {
        uuid,
        isDeleted: false,
      },
      include: INCLUDE_TARGETS,
    });

    if (!communication) {
      throw new RpcException(`Communication with uuid ${uuid} not found`);
    }

    return communication;
  }

  async update(uuid: string, dto: UpdateCommunicationDto) {
    this.logger.log(`Updating communication: ${uuid}`);
    const communication = await this.findOne(uuid);

    const data: Record<string, any> = this.toWritableData(dto);

    if (dto.targets !== undefined) {
      const isUntouched = communication.targets.every(
        (target) => target.status === CommunicationTargetStatus.PENDING,
      );

      if (!isUntouched) {
        throw new RpcException({
          message:
            'Targets cannot be changed once the communication has been triggered.',
          code: 'COMMUNICATION_ALREADY_TRIGGERED',
        });
      }

      // Replaces the whole list, in the same statement as the other fields.
      data.targets = {
        deleteMany: {},
        createMany: { data: this.toTargetRows(dto.targets) },
      };
    }

    try {
      return await this.prisma.communication.update({
        where: { uuid },
        data,
        include: INCLUDE_TARGETS,
      });
    } catch (error: any) {
      this.logger.error(`Failed to update communication ${uuid}`, error);
      throw new RpcException(
        error?.message || 'Failed to update communication',
      );
    }
  }

  async remove(uuid: string) {
    this.logger.log(`Removing communication: ${uuid}`);
    await this.findOne(uuid);

    try {
      return await this.prisma.communication.update({
        where: { uuid },
        data: {
          isDeleted: true,
          targets: {
            updateMany: {
              where: { status: CommunicationTargetStatus.PENDING },
              data: { status: CommunicationTargetStatus.CANCELLED },
            },
          },
        },
        include: INCLUDE_TARGETS,
      });
    } catch (error: any) {
      this.logger.error(`Failed to remove communication ${uuid}`, error);
      throw new RpcException(
        error?.message || 'Failed to remove communication',
      );
    }
  }

  /**
   * Broadcasts the communication to each of its groups. Every group gets its
   * own comms session, and a failure for one group is recorded on that target
   * without stopping the others. Pass `targetUuids` to retry specific groups.
   */
  async trigger(uuid: string, appId: string, targetUuids?: string[]) {
    this.logger.log(`Triggering communication: ${uuid}`);
    const communication = await this.findOne(uuid);

    if (!communication.transportId) {
      throw new RpcException({
        message: 'Communication has no transport.',
        code: 'COMMUNICATION_TRANSPORT_MISSING',
      });
    }

    const { data: transport } = await this.commsClient.transport.get(
      communication.transportId,
    );

    if (!transport) {
      throw new RpcException({
        message: 'Selected transport not found.',
        code: 'SELECTED_TRANSPORT_NOT_FOUND',
      });
    }

    let content: string;
    let subject = 'INFO';

    if (transport.type === TransportType.VOICE) {
      const audio = communication.audioURL as { mediaURL?: string } | null;
      content = audio?.mediaURL;
    } else {
      content = communication.message;
      if (transport.type === TransportType.SMTP)
        subject = communication.subject;
    }

    if (!content) {
      throw new RpcException({
        message: 'Communication has no content to send.',
        code: 'COMMUNICATION_CONTENT_MISSING',
      });
    }

    const targets = communication.targets.filter(
      (target) =>
        TRIGGERABLE_STATUSES.includes(target.status) &&
        (!targetUuids?.length || targetUuids.includes(target.uuid)),
    );

    if (!targets.length) {
      throw new RpcException({
        message: 'Communication has no pending or failed groups to send to.',
        code: 'COMMUNICATION_NO_TRIGGERABLE_TARGETS',
      });
    }

    for (const target of targets) {
      // Claims the target, so a concurrent trigger cannot send it twice.
      const { count } = await this.prisma.communicationGroupTarget.updateMany({
        where: { id: target.id, status: { in: TRIGGERABLE_STATUSES } },
        data: { status: CommunicationTargetStatus.PROCESSING, error: null },
      });

      if (!count) continue;

      try {
        const addresses = await this.activityService.getAddresses(
          target.groupType as CommunicationGroupType,
          target.groupId,
          appId,
          transport.validationAddress as ValidationAddress,
        );

        const { data: session } = await this.commsClient.broadcast.create({
          addresses,
          maxAttempts: 3,
          message: {
            content,
            meta: { subject },
          },
          options: {},
          transport: communication.transportId,
          trigger: TriggerType.IMMEDIATE,
          xref: appId,
        });

        if (!session) {
          throw new RpcException({
            message: 'Session not found.',
            code: 'SESSION_NOT_FOUND',
          });
        }

        await this.prisma.communicationGroupTarget.update({
          where: { id: target.id },
          data: {
            status: CommunicationTargetStatus.SENT,
            sessionId: session.cuid,
          },
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to trigger communication ${uuid} for ${target.groupType} ${target.groupId}`,
          error,
        );

        await this.prisma.communicationGroupTarget.update({
          where: { id: target.id },
          data: {
            status: CommunicationTargetStatus.FAILED,
            error: this.getErrorMessage(error),
          },
        });
      }
    }

    return this.findOne(uuid);
  }
}
