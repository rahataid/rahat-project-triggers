import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@rumsan/prisma';
import { StatDto } from './dto/stat.dto';
import { ActivityStatus } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { ActivityService } from 'src/activity/activity.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async calculatePhaseActivities() {
    const phases = await this.prisma.phase.findMany();
    let activitiesStats = [];

    for (const phase of phases) {
      const appsInPhase = await this.prisma.activity.groupBy({
        by: ['app'],
        where: {
          phaseId: phase.uuid,
          isDeleted: false,
        },
        _count: {
          _all: true,
        },
      });

      for (const appGroup of appsInPhase) {
        const { app, _count } = appGroup;

        const totalActivities = _count._all;

        const totalCompletedActivities = await this.prisma.activity.count({
          where: {
            phaseId: phase.uuid,
            app,
            status: ActivityStatus.COMPLETED,
            isDeleted: false,
          },
        });

        const completedPercentage = totalCompletedActivities
          ? ((totalCompletedActivities / totalActivities) * 100).toFixed(2)
          : '0.00';

        activitiesStats.push({
          app,
          totalActivities,
          totalCompletedActivities,
          completedPercentage,
          phase,
        });
      }
    }

    //  Group by app and save individually
    const statsByApp = activitiesStats.reduce(
      (acc, stat) => {
        acc[stat.app] = acc[stat.app] || [];
        acc[stat.app].push(stat);
        return acc;
      },
      {} as Record<string, typeof activitiesStats>,
    );

    for (const app in statsByApp) {
      await this.save({
        name: `ACTIVITIES_${app}`,
        group: 'activities',
        data: statsByApp[app],
      });
    }

    return;
  }

  async calculateActivitiesWithCommunication() {
    const communicationActivity = await this.prisma.activity.groupBy({
      by: ['app'],
      where: {
        isDeleted: false,
        activityCommunication: {
          not: [],
        },
      },
      _count: {
        _all: true,
      },
    });

    for (const project of communicationActivity) {
      await this.save({
        name: `ACTIVITIES_WITH_COMM_${project.app}`,
        group: 'activitieswithCommunication',
        data: { count: project._count._all },
      });
    }
  }
  async calculateActivitiesAutomated() {
    const automatedActivity = await this.prisma.activity.groupBy({
      by: ['app'],
      where: {
        isDeleted: false,
        isAutomated: true,
      },
      _count: {
        _all: true,
      },
    });

    for (const project of automatedActivity) {
      await this.save({
        name: `ACTIVITIES_AUTOMATED_${project.app}`,
        group: 'activitiesAutomated',
        data: { count: project._count._all },
      });
    }
  }

  async calculateCommsStatsForAllApps() {
    this.logger.log('Fetching communication stats for all apps');

    try {
      const groupedActivities = await this.prisma.activity.groupBy({
        by: ['app'],
        where: {
          isDeleted: false,
          activityCommunication: { not: { equals: [] } },
        },
        _count: {
          _all: true,
        },
      });

      for (const group of groupedActivities) {
        const appId = group.app;
        // const k = await this.activityService.getCommsStats(appId);
        const k = await this.activityService.getTransportSessionStatsByGroup(appId);
        await this.save({
          name: `COMMS_STATS_${appId}`,
          group: 'commsStats',
          data: k,
        });
      }

      this.logger.log('Communication stats calculated and saved successfully.');
    } catch (error) {
      this.logger.error('Error while calculating communication stats', error);
      throw new RpcException(error?.message || 'Something went wrong');
    }
  }

  async calculateAllStats() {
    const [
      calculatePhaseActivities,
      calculateActivitiesAutomated,
      calculateActivitiesWithCommunication,
      calculateCommsStatsForAllApps,
    ] = await Promise.all([
      this.calculatePhaseActivities(),
      this.calculateActivitiesAutomated(),
      this.calculateActivitiesWithCommunication(),
      this.calculateCommsStatsForAllApps(),
    ]);

    return {
      calculatePhaseActivities,
      calculateActivitiesAutomated,
      calculateActivitiesWithCommunication,
      calculateCommsStatsForAllApps,
    };
  }

  async save(data: StatDto) {
    data.name = data.name.toUpperCase();

    return this.prisma.stats.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
  }

  findOne() {
    return this.prisma.stats.findMany();
  }

  async findAll(payload) {
    const { appId } = payload;
    const sanitizedApp = appId.toUpperCase();
    const result = await this.prisma.stats.findMany({
      where: {
        name: {
          contains: sanitizedApp, // matches name containing appId
          mode: 'insensitive', // optional: case-insensitive match
        },
      },
    });
    return result;
  }
}
