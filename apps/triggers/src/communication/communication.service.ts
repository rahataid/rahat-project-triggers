import {
  CommunicationTargetStatus,
  paginator,
  PaginatorTypes,
  PrismaService,
} from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  SessionStatus,
  TransportType,
  TriggerType,
  ValidationAddress,
} from '@rumsan/connect';
import { ActivityService } from 'src/activity/activity.service';
import type { CommsClient } from 'src/comms/comms.service';
import { batchFetchSessionStatuses } from 'src/comms/comms.utils';
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
  'isScheduled',
  'scheduledAt',
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
  ) { }

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

    if (dto.isScheduled !== undefined) data.isScheduled = Boolean(dto.isScheduled);
    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
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
      const created = await this.prisma.communication.create({
        data: {
          ...(this.toWritableData(dto) as any),
          targets: {
            createMany: { data: this.toTargetRows(dto.targets) },
          },
        },
        include: INCLUDE_TARGETS,
      });

      if (dto.isScheduled && dto.scheduledAt) {
        try {
          return await this.trigger(created.uuid, dto.xrefId);
        } catch (triggerError) {
          this.logger.error(
            `Failed to auto-trigger scheduled communication ${created.uuid}`,
            triggerError,
          );
        }
      }

      return created;
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
      startDate,
      endDate,
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

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const query = {
      where: {
        isDeleted: false,
        ...(title && { title: { contains: title, mode: 'insensitive' } }),
        ...(xrefId && xrefId !== 'all' && { xrefId }),
        ...(transportId && { transportId }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
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
      const paginatedResult = await paginate(this.prisma.communication, query, {
        page,
        perPage,
      });

      paginatedResult.data = await this.enrichWithSessionStatus(
        paginatedResult.data,
        xrefId,
      );

      return paginatedResult;
    } catch (error: any) {
      this.logger.error('Failed to list communications', error);
      throw new RpcException(error?.message || 'Failed to list communications');
    }
  }

  private async enrichWithSessionStatus<
    T extends { targets?: any[] }
  >(communications: T[], xrefId?: string): Promise<T[]> {
    if (!communications?.length) return communications;

    const sessionIds = communications
      .flatMap((c) => c.targets ?? [])
      .map((t) => t.sessionId)
      .filter(Boolean);

    const effectiveXrefId =
      xrefId && xrefId !== 'all'
        ? xrefId
        : (communications.find((c: any) => c.xrefId) as any)?.xrefId;

    const sessionCache = await batchFetchSessionStatuses(
      this.commsClient,
      sessionIds,
      25,
      6000,
      effectiveXrefId,
    );

    return communications.map((comm) => {
      if (!comm.targets?.length) return comm;

      const isCommFuture = Boolean(
        (comm as any).isScheduled &&
        (comm as any).scheduledAt &&
        new Date((comm as any).scheduledAt).getTime() > Date.now(),
      );

      const targets = comm.targets.map((target) => {
        if (!target.sessionId) {
          return {
            ...target,
            sessionStatus: isCommFuture
              ? 'SCHEDULED'
              : target.status === CommunicationTargetStatus.PENDING
                ? 'Not Started'
                : target.status,
            counts: isCommFuture
              ? { SUCCESS: 0, FAIL: 0, PENDING: 0, SCHEDULED: 1, TOTAL: 1 }
              : null,
          };
        }

        const session = sessionCache.get(target.sessionId);
        const hasError =
          target.status === CommunicationTargetStatus.FAILED ||
          Boolean(target.error);

        const isTargetScheduled = Boolean(
          isCommFuture && (session?.counts?.SUCCESS ?? 0) === 0,
        );

        return {
          ...target,
          sessionStatus: hasError
            ? SessionStatus.FAILED
            : isTargetScheduled
              ? 'SCHEDULED'
              : session?.status || target.status,
          counts: session?.counts ?? null,
        };
      });

      return {
        ...comm,
        targets,
      };
    });
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

    const [communicationWithStatus] = await this.enrichWithSessionStatus(
      [communication],
      communication.xrefId,
    );

    return communicationWithStatus;
  }

  async getCommunicationOverview(payload: any) {
    this.logger.log('Fetching communication overview with pagination');
    try {
      const {
        appId: rawAppId,
        project,
        startDate: rawStartDate,
        from,
        endDate: rawEndDate,
        to,
        phase,
        groupType,
        recipient,
        transportId,
        channel,
        title,
        search,
        source = 'all',
        page: rawPage,
        currentPage: rawCurrentPage,
        perPage: rawPerPage,
        limit: rawLimit,
      } = payload || {};

      const appId = rawAppId || project;
      const startDate = rawStartDate || from;
      const endDate = rawEndDate || to;
      const effectiveSearch = (search || title || '').trim().toLowerCase();
      const effectiveRecipient = (recipient || groupType || '').toUpperCase().trim();
      const currentPage = Math.max(1, Number(rawPage ?? rawCurrentPage ?? 1));
      const limit = Math.max(1, Number(rawPerPage ?? rawLimit ?? 10));

      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      const overviewRows: any[] = [];
      const phaseByCommId = new Map<string, string>();
      const phaseBySessionId = new Map<string, string>();

      const classifyChannel = (item: any): string => {
        if (item?.audioURL) return 'VOICE';
        if (typeof item?.message === 'object' && item?.message?.mediaURL) return 'VOICE';
        if (typeof item?.message === 'string' && /\.(mp3|wav|ogg|m4a)/i.test(item?.message)) return 'VOICE';
        if (item?.subject) return 'EMAIL';
        return 'SMS';
      };

      if (source !== 'communications') {
        const actWhere: any = {
          isDeleted: false,
          activityCommunication: { not: [] },
        };
        if (appId && appId !== 'all') actWhere.app = appId;
        if (Object.keys(dateFilter).length > 0) actWhere.createdAt = dateFilter;
        if (phase && phase !== 'all') {
          actWhere.phase = { name: { equals: phase, mode: 'insensitive' } };
        }
        if (effectiveSearch) {
          actWhere.title = { contains: effectiveSearch, mode: 'insensitive' };
        }

        const activities = await this.prisma.activity.findMany({
          where: actWhere,
          include: {
            phase: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        for (const act of activities) {
          const actPhase = act.phase?.name || 'N/A';
          const rawComms = Array.isArray(act.activityCommunication)
            ? (act.activityCommunication as any[])
            : [];

          if (!rawComms.length) {
            overviewRows.push({
              id: `act-${act.uuid}`,
              date: (act.updatedAt || act.createdAt).toISOString(),
              projectId: act.app,
              title: act.title,
              channel: 'SMS',
              transportName: 'SMS',
              groupName: 'General',
              recipientType: 'BENEFICIARY',
              phase: actPhase,
              status: act.status || 'NOT_STARTED',
              delivered: act.status === 'COMPLETED' ? 1 : 0,
              total: 1,
              failed: 0,
              pending: act.status === 'NOT_STARTED' ? 1 : 0,
              activityId: act.uuid,
              source: 'activity',
            });
            continue;
          }

          for (let idx = 0; idx < rawComms.length; idx++) {
            const c: any = rawComms[idx] || {};
            const commId = c.communicationId || '';
            const sessionId = c.sessionId || '';
            const gType = (c.groupType || 'BENEFICIARY').toUpperCase();
            const ch = classifyChannel(c);

            if (actPhase && actPhase !== 'N/A') {
              if (commId) phaseByCommId.set(commId, actPhase);
              if (sessionId) phaseBySessionId.set(sessionId, actPhase);
            }

            const isActScheduled = Boolean(c.isScheduled || c.scheduledAt);
            const isActFuture = Boolean(
              c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now(),
            );

            overviewRows.push({
              id: `act-${act.uuid}-${commId || sessionId || idx}`,
              date: (act.updatedAt || act.createdAt).toISOString(),
              projectId: act.app,
              title: c.communicationTitle || act.title,
              channel: ch,
              transportName: ch,
              groupName:
                c.groupName ||
                (gType.includes('STAKEHOLDER')
                  ? 'Stakeholders'
                  : 'Beneficiaries'),
              recipientType: gType.includes('STAKEHOLDER')
                ? 'STAKEHOLDER'
                : 'BENEFICIARY',
              phase: actPhase,
              status: isActFuture ? 'SCHEDULED' : (act.status || 'NOT_STARTED'),
              delivered: act.status === 'COMPLETED' ? 1 : 0,
              total: 1,
              failed: 0,
              pending: act.status === 'NOT_STARTED' && !isActFuture ? 1 : 0,
              scheduled: isActFuture ? 1 : 0,
              isScheduled: isActScheduled,
              scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString() : null,
              sessionId: sessionId || undefined,
              communicationId: commId || undefined,
              activityId: act.uuid,
              message:
                typeof c.message === 'string'
                  ? c.message
                  : c.message?.fileName,
              source: 'activity',
            });
          }
        }
      }

      if (source !== 'activities') {
        const commWhere: any = {
          isDeleted: false,
        };
        if (appId && appId !== 'all') commWhere.xrefId = appId;
        if (Object.keys(dateFilter).length > 0) commWhere.createdAt = dateFilter;
        if (transportId) commWhere.transportId = transportId;
        if (effectiveSearch) {
          commWhere.title = { contains: effectiveSearch, mode: 'insensitive' };
        }
        if (effectiveRecipient && effectiveRecipient !== 'ALL') {
          commWhere.targets = {
            some: {
              groupType: { contains: effectiveRecipient, mode: 'insensitive' },
            },
          };
        }

        const communications = await this.prisma.communication.findMany({
          where: commWhere,
          include: INCLUDE_TARGETS,
          orderBy: { createdAt: 'desc' },
        });

        for (const comm of communications) {
          const targets = Array.isArray(comm.targets) ? comm.targets : [];
          const ch = classifyChannel(comm);
          const commPhase =
            phaseByCommId.get(comm.uuid) ||
            targets
              .map((t) => t.sessionId && phaseBySessionId.get(t.sessionId))
              .find(Boolean) ||
            'N/A';

          const isCommFuture = Boolean(
            comm.isScheduled &&
            comm.scheduledAt &&
            new Date(comm.scheduledAt).getTime() > Date.now(),
          );

          if (!targets.length) {
            overviewRows.push({
              id: `comm-${comm.uuid}`,
              date: (comm.updatedAt || comm.createdAt).toISOString(),
              projectId: comm.xrefId || '',
              title: comm.title,
              channel: ch,
              transportName: ch,
              groupName: 'General',
              recipientType: 'BENEFICIARY',
              phase: commPhase,
              status: isCommFuture ? 'SCHEDULED' : 'NOT_STARTED',
              delivered: 0,
              total: 1,
              failed: 0,
              pending: isCommFuture ? 0 : 1,
              scheduled: isCommFuture ? 1 : 0,
              isScheduled: Boolean(comm.isScheduled),
              scheduledAt: comm.scheduledAt ? comm.scheduledAt.toISOString() : null,
              communicationId: comm.uuid,
              subject: comm.subject || undefined,
              message:
                typeof comm.message === 'string' ? comm.message : undefined,
              source: 'communication',
            });
            continue;
          }

          for (const target of targets) {
            const gType = (target.groupType || 'BENEFICIARY').toUpperCase();
            const targetPhase =
              (target.sessionId && phaseBySessionId.get(target.sessionId)) ||
              commPhase;

            overviewRows.push({
              id: `comm-${comm.uuid}-${target.uuid || target.id}`,
              date: (comm.updatedAt || comm.createdAt).toISOString(),
              projectId: comm.xrefId || '',
              title: comm.title,
              channel: ch,
              transportName: ch,
              groupName:
                (target as any).groupName ||
                (gType.includes('STAKEHOLDER')
                  ? 'Stakeholders'
                  : 'Beneficiaries'),
              recipientType: gType.includes('STAKEHOLDER')
                ? 'STAKEHOLDER'
                : 'BENEFICIARY',
              phase: targetPhase,
              status: isCommFuture ? 'SCHEDULED' : (target.status || 'PENDING'),
              delivered: target.status === 'SENT' ? 1 : 0,
              total: 1,
              failed: target.status === 'FAILED' ? 1 : 0,
              pending: target.status === 'PENDING' && !isCommFuture ? 1 : 0,
              scheduled: isCommFuture ? 1 : 0,
              isScheduled: Boolean(comm.isScheduled),
              scheduledAt: comm.scheduledAt ? comm.scheduledAt.toISOString() : null,
              sessionId: target.sessionId || undefined,
              communicationId: comm.uuid,
              subject: comm.subject || undefined,
              message:
                typeof comm.message === 'string' ? comm.message : undefined,
              failReason: target.error || undefined,
              source: 'communication',
            });
          }
        }
      }

      const seenCommIds = new Set(
        overviewRows
          .filter((r) => r.source === 'communication' && r.communicationId)
          .map((r) => r.communicationId),
      );
      const seenSessionIds = new Set(
        overviewRows
          .filter((r) => r.source === 'communication' && r.sessionId)
          .map((r) => r.sessionId),
      );

      let deduped = overviewRows.filter((r) => {
        if (r.source === 'activity') {
          if (r.communicationId && seenCommIds.has(r.communicationId)) return false;
          if (r.sessionId && seenSessionIds.has(r.sessionId)) return false;
        }
        return true;
      });

      if (effectiveRecipient && effectiveRecipient !== 'ALL') {
        deduped = deduped.filter((r) =>
          r.recipientType.toUpperCase().includes(effectiveRecipient),
        );
      }
      if (channel && channel !== 'all') {
        deduped = deduped.filter(
          (r) => r.channel.toUpperCase() === channel.toUpperCase(),
        );
      }
      if (phase && phase !== 'all') {
        deduped = deduped.filter(
          (r) =>
            r.phase &&
            r.phase.toUpperCase() !== 'N/A' &&
            r.phase.toLowerCase() === phase.toLowerCase(),
        );
      }
      if (effectiveSearch) {
        deduped = deduped.filter(
          (r) =>
            (r.title && r.title.toLowerCase().includes(effectiveSearch)) ||
            (r.message && r.message.toLowerCase().includes(effectiveSearch)) ||
            (r.subject && r.subject.toLowerCase().includes(effectiveSearch)),
        );
      }

      deduped.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      const total = deduped.length;
      const lastPage = Math.ceil(total / limit) || 1;
      const paginatedItems = deduped.slice(
        (currentPage - 1) * limit,
        currentPage * limit,
      );

      const pageSessionIds = paginatedItems
        .map((r) => r.sessionId)
        .filter((s): s is string => Boolean(s));

      if (pageSessionIds.length > 0) {
        try {
          const sessionCache = await batchFetchSessionStatuses(
            this.commsClient,
            pageSessionIds,
            10,
            3000,
            appId && appId !== 'all' ? appId : undefined,
          );

          for (const item of paginatedItems) {
            if (item.sessionId && sessionCache.has(item.sessionId)) {
              const res = sessionCache.get(item.sessionId);
              if (res) {
                if (res.status) item.status = res.status;
                if (res.counts) {
                  item.delivered = res.counts.SUCCESS || 0;
                  item.failed = res.counts.FAIL || 0;
                  item.scheduled = res.counts.SCHEDULED || 0;
                  item.pending = res.counts.PENDING || 0;
                  item.total =
                    res.counts.TOTAL ||
                    item.delivered + item.failed + item.pending + item.scheduled;
                }
              }
            }
            if (
              item.isScheduled &&
              item.scheduledAt &&
              new Date(item.scheduledAt).getTime() > Date.now() &&
              (item.delivered ?? 0) === 0
            ) {
              item.status = 'SCHEDULED';
            }
          }
        } catch {
          // Keep current status if comms service is offline
        }
      }

      return {
        data: paginatedItems,
        meta: {
          total,
          lastPage,
          currentPage,
          perPage: limit,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to get communication overview', error);
      throw new RpcException(
        error?.message || 'Failed to get communication overview',
      );
    }
  }

  async update(uuid: string, dto: UpdateCommunicationDto) {
    this.logger.log(`Updating communication: ${uuid}`);
    const communication = await this.findOne(uuid);

    const isFutureScheduled = Boolean(
      communication.isScheduled &&
      communication.scheduledAt &&
      new Date(communication.scheduledAt).getTime() > Date.now(),
    );

    const data: Record<string, any> = this.toWritableData(dto);

    if (dto.targets !== undefined) {
      const isUntouched = communication.targets.every(
        (target) =>
          target.status === CommunicationTargetStatus.PENDING ||
          isFutureScheduled,
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
    } else if (isFutureScheduled) {
      data.targets = {
        updateMany: {
          where: {},
          data: {
            status: CommunicationTargetStatus.PENDING,
            sessionId: null,
          },
        },
      };
    }

    try {
      const updated = await this.prisma.communication.update({
        where: { uuid },
        data,
        include: INCLUDE_TARGETS,
      });

      if (updated.isScheduled && updated.scheduledAt) {
        try {
          await this.trigger(uuid, dto.xrefId || communication.xrefId);
        } catch (triggerError: any) {
          this.logger.error(
            `Failed to schedule broadcast session in Connect for updated communication ${uuid}`,
            triggerError,
          );
        }
      }

      return updated;
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
  async trigger(uuid: string, appId?: string, targetUuids?: string[]) {
    this.logger.log(`Triggering communication: ${uuid}`);
    const communication = await this.findOne(uuid);
    const effectiveAppId = appId || communication.xrefId;

    if (!effectiveAppId) {
      throw new RpcException({
        message: 'Communication has no associated project (xrefId).',
        code: 'COMMUNICATION_XREFID_MISSING',
      });
    }

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
          effectiveAppId,
          transport.validationAddress as ValidationAddress,
        );

        const isScheduledFuture = Boolean(
          communication.isScheduled &&
          communication.scheduledAt &&
          new Date(communication.scheduledAt).getTime() > Date.now(),
        );

        const { data: session } = await this.commsClient.broadcast.create({
          addresses,
          maxAttempts: 3,
          message: {
            content,
            meta: { subject },
          },
          options: isScheduledFuture
            ? { scheduledTimestamp: new Date(communication.scheduledAt) }
            : {},
          transport: communication.transportId,
          trigger: isScheduledFuture
            ? TriggerType.SCHEDULED
            : TriggerType.IMMEDIATE,
          xref: effectiveAppId,
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
