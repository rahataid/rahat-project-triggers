import { PrismaService } from '@lib/database';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { activities, ActivityLibrary } from 'src/utils/activities';
import { GetActivityTemplatesDto } from './dto';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getActivityTemplates(payload: GetActivityTemplatesDto) {
    this.logger.log(
      'Fetching activity templates from library',
      JSON.stringify(payload),
    );

    const {
      page = 1,
      perPage = 50,
      phase,
      hasCommunication,
      category,
      title,
      isAutomated,
      appId,
    } = payload;

    try {
      // 1. Fetch templates from DB
      const dbTemplates = await this.fetchDbTemplates({
        appId,
        phase,
        hasCommunication,
        category,
        title,
        isAutomated,
      });

      // 2. Filter dummy/default templates
      const filteredDefaults = this.filterDefaultTemplates({
        phase,
        hasCommunication,
        category,
        title,
        isAutomated,
      });

      // 3. Merge DB templates with defaults (DB templates take priority)
      const merged = this.mergeTemplates(dbTemplates, filteredDefaults);

      // 4. Paginate merged results
      const currentPage = Number(page) || 1;
      const currentPerPage = Number(perPage) || 50;

      const total = merged.length;
      const startIndex = (currentPage - 1) * currentPerPage;
      const paginatedData = merged.slice(
        startIndex,
        startIndex + currentPerPage,
      );
      const lastPage = Math.ceil(total / currentPerPage);

      return {
        data: paginatedData,
        meta: {
          total,
          lastPage,
          currentPage,
          perPage: currentPerPage,
          prev: currentPage > 1 ? currentPage - 1 : null,
          next: currentPage < lastPage ? currentPage + 1 : null,
        },
      };
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch activity templates from library',
        error,
      );
      throw new RpcException(
        error?.message || 'Failed to fetch activity templates',
      );
    }
  }

  async getActivityTemplateById(payload: { uuid: string; appId?: string }) {
    const { uuid, appId } = payload;
    this.logger.log(`Fetching activity template with uuid: ${uuid}`);

    try {
      const defaultTemplate = activities.find((a) => a.uuid === uuid);
      if (defaultTemplate) {
        return this.mapDefaultToTemplateResponse(defaultTemplate);
      }

      const dbTemplate = await this.prisma.activity.findFirst({
        where: {
          uuid,
          isTemplate: true,
          isDeleted: false,
          ...(appId && { app: appId }),
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

      if (!dbTemplate) {
        throw new RpcException('Activity template not found');
      }

      return dbTemplate;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch activity template with uuid: ${uuid}`,
        error,
      );
      throw new RpcException(
        error?.message || 'Failed to fetch activity template',
      );
    }
  }

  private async fetchDbTemplates(filters: {
    appId?: string;
    phase?: string;
    hasCommunication?: boolean;
    category?: string;
    title?: string;
    isAutomated?: string;
  }) {
    const { appId, phase, hasCommunication, category, title, isAutomated } =
      filters;

    const where: Record<string, any> = {
      isTemplate: true,
      isDeleted: false,
      ...(appId && { app: appId }),
      ...(title && { title: { contains: title, mode: 'insensitive' } }),
      ...(isAutomated && {
        isAutomated: isAutomated === 'true',
      }),
      ...(phase && {
        phase: {
          name: phase,
        },
      }),
      ...(category && {
        category: {
          name: { contains: category, mode: 'insensitive' },
        },
      }),
    };

    const dbResults = await this.prisma.activity.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            uuid: true,
          },
        },
        phase: {
          select: {
            name: true,
            uuid: true,
          },
        },
        manager: {
          select: {
            name: true,
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Post-filter for hasCommunication (JSON field)
    if (hasCommunication) {
      return dbResults.filter(
        (a) =>
          Array.isArray(a.activityCommunication) &&
          (a.activityCommunication as any[]).length > 0,
      );
    } else if (hasCommunication === false) {
      return dbResults.filter(
        (a) =>
          !a.activityCommunication ||
          !Array.isArray(a.activityCommunication) ||
          (a.activityCommunication as any[]).length === 0,
      );
    }

    return dbResults;
  }

  private filterDefaultTemplates(filters: {
    phase?: string;
    hasCommunication?: boolean;
    category?: string;
    title?: string;
    isAutomated?: string;
  }): ActivityLibrary[] {
    const { phase, hasCommunication, category, title, isAutomated } = filters;

    let filtered = [...activities];

    if (phase) {
      filtered = filtered.filter(
        (a) => a.phase.name.toUpperCase() === phase.toUpperCase(),
      );
    }

    if (category) {
      filtered = filtered.filter((a) =>
        a.category.name.toLowerCase().includes(category.toLowerCase()),
      );
    }

    if (title) {
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(title.toLowerCase()),
      );
    }

    if (isAutomated) {
      const automated = isAutomated === 'true';
      filtered = filtered.filter((a) => a.isAutomated === automated);
    }

    if (hasCommunication) {
      filtered = filtered.filter(
        (a) =>
          Array.isArray(a.activityCommunication) &&
          a.activityCommunication.length > 0,
      );
    } else if (hasCommunication === false) {
      filtered = filtered.filter(
        (a) =>
          !a.activityCommunication ||
          !Array.isArray(a.activityCommunication) ||
          a.activityCommunication.length === 0,
      );
    }

    return filtered;
  }

  private mergeTemplates(
    dbTemplates: any[],
    defaultTemplates: ActivityLibrary[],
  ) {
    const dbUuids = new Set(dbTemplates.map((t) => t.uuid));

    // Filter out defaults whose uuid already exists in DB results
    const uniqueDefaults = defaultTemplates
      .filter((d) => !dbUuids.has(d.uuid))
      .map((d) => this.mapDefaultToTemplateResponse(d));

    return [...dbTemplates, ...uniqueDefaults];
  }

  private mapDefaultToTemplateResponse(template: ActivityLibrary) {
    return {
      uuid: template.uuid,
      title: template.title,
      description: template.description,
      leadTime: template.leadTime,
      phase: template.phase,
      category: template.category,
      isAutomated: template.isAutomated,
      isTemplate: true,
      activityDocuments: template.activityDocuments,
      activityCommunication: template.activityCommunication,
      activityPayout: template.activityPayout,
      source: 'default',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
