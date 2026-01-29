import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { Cron } from '@nestjs/schedule';
import {
  DhmWaterLevelAdapter,
  DhmRainfallAdapter,
  DhmService,
  DhmObservation,
  DhmInputItem,
  RiverStationItem,
  DhmSourceDataTypeEnum,
} from '@lib/dhm-adapter';
import { GlofasAdapter, GlofasServices } from '@lib/glofas-adapter';
import { GfhAdapter, GfhService } from '@lib/gfh-adapter';
import {
  Indicator,
  isErr,
  HealthMonitoringService,
  HealthMonitoredAdapter,
  HealthCacheService,
  ObservationAdapter,
} from '@lib/core';
import { SourceType, PrismaService, DataSource } from '@lib/database';
import { SourceDataType } from './dto/get-source-data';
import { RpcException } from '@nestjs/microservices';
import type { GlofasStationInfo } from '@lib/database';

@Injectable()
export class ScheduleSourcesDataService
  implements OnModuleInit, OnApplicationBootstrap
{
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  private dhmWaterMonitored: HealthMonitoredAdapter<undefined>;
  private dhmRainfallMonitored: HealthMonitoredAdapter<undefined>;
  private glofasMonitored: HealthMonitoredAdapter<null>;
  private gfhMonitored: HealthMonitoredAdapter<undefined>;

  constructor(
    @Inject(HealthCacheService)
    private readonly healthCacheService: HealthCacheService,
    private readonly dhmWaterLevelAdapter: DhmWaterLevelAdapter,
    private readonly dhmRainfallLevelAdapter: DhmRainfallAdapter,
    private readonly glofasAdapter: GlofasAdapter,
    private readonly gfhAdapter: GfhAdapter,
    private readonly dhmService: DhmService,
    private readonly glofasServices: GlofasServices,
    private readonly gfhService: GfhService,
    private readonly healthService: HealthMonitoringService,
    private readonly prisma: PrismaService,
  ) {
    this.dhmWaterMonitored = this.wrapWithHealthMonitoring(
      this.dhmWaterLevelAdapter,
    );
    this.dhmRainfallMonitored = this.wrapWithHealthMonitoring(
      this.dhmRainfallLevelAdapter,
    );
    this.glofasMonitored = this.wrapWithHealthMonitoring(this.glofasAdapter);
    this.gfhMonitored = this.wrapWithHealthMonitoring(this.gfhAdapter);
  }

  onModuleInit() {
    HealthMonitoringService.setCacheService(this.healthCacheService);
    [
      this.dhmWaterLevelAdapter,
      this.dhmRainfallLevelAdapter,
      this.glofasAdapter,
      this.gfhAdapter,
    ].forEach((adapter) => adapter.setHealthService(this.healthService));
  }

  onApplicationBootstrap() {
    this.syncRiverWaterData();
    this.syncRainfallData();
    this.synchronizeGlofas();
    this.syncGfhData();
  }

  private wrapWithHealthMonitoring<T>(
    adapter: ObservationAdapter<T>,
  ): HealthMonitoredAdapter<T> {
    return new HealthMonitoredAdapter(
      adapter,
      this.healthService,
      adapter.getAdapterId(),
    );
  }

  // run every 15 minutes
  @Cron('*/15 * * * * *')
  async syncRiverWaterData() {
    const riverData = await this.dhmWaterMonitored.execute();

    if (isErr<Indicator[]>(riverData)) {
      this.logger.warn(riverData.details);
      if (riverData.details instanceof AxiosError) {
        const errorMessage = `HTTP Error: ${riverData.details.response?.status} ${riverData.details.response?.statusText} - Data: ${JSON.stringify(riverData.details.response?.data)} - Config: ${JSON.stringify(riverData.details.response?.config)}`;
        this.logger.warn(errorMessage);
      } else {
        this.logger.warn(riverData.details);
      }
      return;
    }

    riverData.data.forEach(async (indicator) => {
      const riverId = (indicator.location as any)?.basinId;
      const seriesId =
        indicator.location.type === 'BASIN'
          ? indicator.location.seriesId?.toString()
          : undefined;

      await this.dhmService.saveDataInDhm(
        SourceType.WATER_LEVEL,
        riverId,
        indicator.info,
        seriesId,
      );
    });
  }

  // run every 15 minutes
  @Cron('*/15 * * * *')
  async syncRainfallData() {
    const rainfallData = await this.dhmRainfallMonitored.execute();
    if (isErr<Indicator[]>(rainfallData)) {
      this.logger.warn(rainfallData.details);
      if (rainfallData.details instanceof AxiosError) {
        const errorMessage = `HTTP Error: ${rainfallData.details.response?.status} ${rainfallData.details.response?.statusText} - Data: ${JSON.stringify(rainfallData.details.response?.data)} - Config: ${JSON.stringify(rainfallData.details.response?.config)}`;
        this.logger.warn(errorMessage);
      } else {
        this.logger.warn(rainfallData.details);
      }
      return;
    }

    rainfallData.data.forEach(async (indicator) => {
      const riverId = (indicator.location as any)?.basinId;
      const seriesId =
        indicator.location.type === 'BASIN'
          ? indicator.location.seriesId?.toString()
          : undefined;

      await this.dhmService.saveDataInDhm(
        SourceType.RAINFALL,
        riverId,
        indicator.info,
        seriesId,
      );
    });
  }

  // run every hour
  @Cron('*/15 * * * * *')
  async synchronizeGlofas() {
    const glofasResult = await this.glofasMonitored.execute(null);

    if (isErr<Indicator[]>(glofasResult)) {
      this.logger.warn(glofasResult.details);
      if (glofasResult.details instanceof AxiosError) {
        const errorMessage = `HTTP Error: ${glofasResult.details.response?.status} ${glofasResult.details.response?.statusText} - Data: ${JSON.stringify(glofasResult.details.response?.data)} - Config: ${JSON.stringify(glofasResult.details.response?.config)}`;
        this.logger.warn(errorMessage);
      } else {
        this.logger.warn(glofasResult.details);
      }
      return;
    }

    const glofasConfig = await this.getGlofasConfig();
    const locationToConfigMap = new Map<string, GlofasStationInfo>();
    if (glofasConfig) {
      glofasConfig.forEach((config) => {
        locationToConfigMap.set(config.LOCATION, config);
      });
    }

    glofasResult.data.forEach(async (indicator) => {
      const basinId = (indicator.location as any).basinId;
      const glofasStationConfig = locationToConfigMap.get(basinId);
      const stationRef =
        glofasStationConfig?.I && glofasStationConfig?.J
          ? `${glofasStationConfig.I}-${glofasStationConfig.J}`
          : undefined;

      await this.glofasServices.saveDataInGlofas(
        basinId,
        indicator as any,
        stationRef,
      );
    });
  }

  private async getGlofasConfig(): Promise<GlofasStationInfo[] | null> {
    try {
      const dataSourceSetting = await this.prisma.setting.findUnique({
        where: { name: 'DATASOURCE' },
      });

      if (!dataSourceSetting?.value) {
        this.logger.warn('DATASOURCE setting not found');
        return null;
      }

      const dataSourceValue = dataSourceSetting.value as {
        GLOFAS?: GlofasStationInfo[];
      };

      return dataSourceValue.GLOFAS || null;
    } catch (error) {
      this.logger.error('Error fetching GLOFAS config', error);
      return null;
    }
  }

  //run every 24 hours
  @Cron('0 0 * * *')
  async syncGfhData() {
    const gfhResult = await this.gfhMonitored.execute();

    if (isErr<Indicator[]>(gfhResult)) {
      this.logger.warn(gfhResult.details);
      if (gfhResult.details instanceof AxiosError) {
        const errorMessage = `HTTP Error: ${gfhResult.details.response?.status} ${gfhResult.details.response?.statusText} - Data: ${JSON.stringify(gfhResult.details.response?.data)} - Config: ${JSON.stringify(gfhResult.details.response?.config)}`;
        this.logger.warn(errorMessage);
      } else {
        this.logger.warn(gfhResult.details);
      }
      return;
    }

    gfhResult.data.forEach(async (indicator) => {
      await this.gfhService.saveDataInGfh(
        SourceType.WATER_LEVEL,
        (indicator.location as any).basinId,
        indicator,
      );
    });
  }

  async getDhmWaterLevels(
    date: Date,
    period: SourceDataType,
    seriesId: number,
  ): Promise<(RiverStationItem & { history: DhmInputItem[] }) | {}> {
    const result: Awaited<
      ReturnType<typeof this.dhmWaterLevelAdapter.executeByPeriod>
    > = await this.dhmWaterLevelAdapter.executeByPeriod(
      date,
      seriesId,
      DhmSourceDataTypeEnum[period],
    );

    if (isErr<DhmObservation[]>(result)) {
      this.logger.warn(result.error);
      throw new RpcException(result.error);
    }

    const observations = result.data as DhmObservation[];

    return {
      ...(observations[0].stationDetail as RiverStationItem),
      history: observations[0].data,
    };
  }
}
