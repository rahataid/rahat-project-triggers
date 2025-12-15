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
import { SourceType } from '@lib/database';

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
  @Cron('*/15 * * * *')
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

      await this.dhmService.saveDataInDhm(
        SourceType.WATER_LEVEL,
        riverId,
        indicator.info,
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
      await this.dhmService.saveDataInDhm(
        SourceType.RAINFALL,
        riverId,
        indicator.info,
      );
    });
  }

  // run every hour
  @Cron('0 * * * *')
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

    glofasResult.data.forEach(async (indicator) => {
      await this.glofasServices.saveDataInGlofas(
        (indicator.location as any).basinId,
        indicator,
      );
    });
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
}
