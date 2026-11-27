import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService, Prisma } from '@lib/database';
import { GetTriggerHistoryDto } from './dto/get-trigger-history.dto';
import { GetOneTriggerHistoryDto } from './dto/get-one-trigger-history';
import { SseService } from 'src/sse/sse.service';

@Injectable()
export class TriggerHistoryService {
  private readonly logger = new Logger(TriggerHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {}

  async create(payload: { phaseUuid: string; user: any }) {
    this.logger.log(`Creating trigger history for phase: ${payload.phaseUuid}`);
    try {
      const phase = await this.prisma.phase.findUnique({
        where: { uuid: payload.phaseUuid },
        include: {
          Trigger: true,
        },
      });

      if (!phase) {
        throw new RpcException({
          message: `Phase with uuid '${payload.phaseUuid}' not found`,
          code: 'PHASE_NOT_FOUND',
          params: { phaseUuid: payload.phaseUuid },
        });
      }

      if (!phase.canRevert) {
        throw new RpcException({
          message: `Phase with uuid '${payload.phaseUuid}' cannot be reverted`,
          code: 'PHASE_CANNOT_BE_REVERTED',
          params: { phaseUuid: payload.phaseUuid },
        });
      }

      if (!phase.isActive) {
        throw new RpcException({
          message: `Phase with uuid '${payload.phaseUuid}' is not active`,
          code: 'PHASE_NOT_ACTIVE',
          params: { phaseUuid: payload.phaseUuid },
        });
      }

      const currentVersion =
        (await this.getCurrentVersionByPhaseId(phase.uuid)) ?? 0;
      this.logger.log(
        `Current version for phase: ${phase.uuid} is ${currentVersion}`,
      );

      const triggerHistory: Prisma.TriggerHistoryCreateManyInput[] =
        phase.Trigger.map((trigger) => {
          const { id, ...rest } = trigger;
          return {
            ...rest,
            phaseActivationDate: phase.activatedAt,
            version: currentVersion + 1,
            revertedAt: new Date(),
            revertedBy: payload.user.name,
          };
        });

      return await this.prisma.$transaction(async (prisma) => {
        await prisma.triggerHistory.createMany({
          data: triggerHistory,
        });

        await prisma.trigger.updateMany({
          where: {
            phaseId: phase.uuid,
          },
          data: {
            notes: null,
            triggeredAt: null,
            triggeredBy: null,
            isTriggered: false,
          },
        });

        const res = await prisma.phase.update({
          where: { uuid: payload.phaseUuid },
          data: {
            receivedMandatoryTriggers: 0,
            receivedOptionalTriggers: 0,
            activatedAt: null,
            isActive: false,
          },
        });
        await this.sseService.publishEvent('phase.updated', res);

        return {
          message: 'Phase reverted successfully',
          code: 'PHASE_REVERTED_SUCCESS',
          phase: res,
          version: currentVersion + 1,
        };
      });
    } catch (error: any) {
      this.logger.error('Error creating trigger history', error);
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async findAll(payload: GetTriggerHistoryDto) {
    this.logger.log(
      `Fetching trigger histories for phase: ${payload.phaseUuid}`,
    );
    if (!payload.phaseUuid) {
      throw new RpcException({
        message: 'Phase uuid is required',
        code: 'UUID_REQUIRED',
      });
    }
    try {
      const triggerHistories = await this.prisma.triggerHistory.findMany({
        where: {
          phaseId: payload.phaseUuid,
          isDeleted: false,
          ...(payload.version && { version: parseInt(payload.version) }),
        },
        include: {
          phase: payload.phase,
        },
        orderBy: {
          version: 'desc',
        },
      });

      // Group trigger histories by version
      const groupedHistories = triggerHistories.reduce(
        (acc, history) => {
          const version = history.version;
          if (!acc[version]) {
            acc[version] = {
              version,
              revertedAt: history.revertedAt,
              revertedBy: history.revertedBy,
              phaseActivationDate: history.phaseActivationDate,
              triggers: [],
            };
          }
          acc[version].triggers.push(history);
          return acc;
        },
        {} as Record<
          number,
          {
            version: number;
            revertedAt: Date;
            revertedBy: string;
            phaseActivationDate: Date;
            triggers: any[];
          }
        >,
      );

      // Convert to array and sort by version
      const result = Object.values(groupedHistories).sort(
        (a, b) => b.version - a.version,
      );

      return {
        data: result,
        meta: {
          total: result.length,
          versions: result.map((r) => r.version),
        },
      };
    } catch (error: any) {
      this.logger.error('Error fetching trigger histories', error);
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getCurrentVersionByPhaseId(phaseId: string): Promise<number> {
    this.logger.log(`Fetching current version for phase: ${phaseId}`);
    try {
      const res = await this.prisma.triggerHistory.findFirst({
        where: {
          phaseId,
        },
        orderBy: {
          version: 'desc',
        },
      });

      return res?.version;
    } catch (error: any) {
      this.logger.error('Error fetching current version', error);
      if (error instanceof RpcException) throw error;
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async getOne(payload: GetOneTriggerHistoryDto) {
    const { id } = payload;
    this.logger.log(`Getting triggerHistory with id: ${id}`);
    try {
      return await this.prisma.triggerHistory.findUnique({
        where: {
          id,
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
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message);
    }
  }
}
