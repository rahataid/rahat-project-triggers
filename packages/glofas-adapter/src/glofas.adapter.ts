import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  Indicator,
  Result,
  Ok,
  ObservationAdapter,
  Err,
  chainAsync,
  isErr,
  DATA_SOURCE_EVENTS,
  DataSourceEventPayload,
  HealthMonitoringService,
  ItemError,
} from '@lib/core';

import { DataSource, GlofasStationInfo, SourceType } from '@lib/database';
import { SettingsService } from '@lib/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getFormattedDate,
  extractTarGz,
  extractDateFromFilename,
  parseDischargeSeries,
  parseReturnLevels,
  DischargeRecord,
  ReturnLevelRecord,
} from './utils';
import { GlofasFetchResponse, GlofasObservation } from './types';
import { GlofasFtpService } from './ftp/glofas-ftp.service';

@Injectable()
export class GlofasAdapter extends ObservationAdapter implements OnApplicationBootstrap {
  private readonly logger = new Logger(GlofasAdapter.name);

  constructor(
    @Inject(HttpService) httpService: HttpService,
    @Inject(GlofasFtpService) private readonly ftpService: GlofasFtpService,
    @Inject(SettingsService) settingsService: SettingsService,
    @Inject(HealthMonitoringService) healthService: HealthMonitoringService,
    @Optional()
    @Inject(EventEmitter2)
    private readonly eventEmitter?: EventEmitter2,
  ) {
    super(httpService, settingsService, {
      dataSource: DataSource.GLOFAS,
    });
    this.setHealthService(healthService);
  }

  getAdapterId(): string {
    return 'GLOFAS';
  }

  async init() {
    this.logger.log('Glofas Adapter initialization');

    const dsConfig = (GlofasAdapter.getCachedDataSourceConfig() as any)?.[DataSource.GLOFAS];
    if (dsConfig?.URL && dsConfig?.USER && dsConfig?.PASSWORD) {
      this.ftpService.configure(dsConfig.URL, dsConfig.USER, dsConfig.PASSWORD);
    } else {
      this.logger.error('FTP credentials missing in DATASOURCECONFIG[GLOFAS]');
    }

    this.registerHealthConfig({
      adapterId: this.getAdapterId(),
      name: 'Glofas FTP',
      dataSource: DataSource.GLOFAS,
      sourceUrl: 'ftp://aux.ecmwf.int',
      fetchIntervalMinutes: 60,
      staleThresholdMultiplier: 1.1,
    });

  }

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.execute();
    if (isErr(result)) {
      this.logger.error(`Initial fetch failed: ${result.error}`);
    }
  }

  async fetch(): Promise<Result<GlofasFetchResponse[]>> {
    const itemErrors: ItemError[] = [];
    const successfulResults: GlofasFetchResponse[] = [];

    try {
      const config: GlofasStationInfo[] = this.getConfig();
      const { dateString } = getFormattedDate();
      const datePart = dateString.replace(/-/g, '');

      this.logger.log(`[Fetch] Starting for ${config.length} station(s), date: ${dateString}`);

      // Step 1: fetch tar.gz from FTP for each configured station
      const results = await Promise.allSettled(
        config.map(async (cfg) => {
          const remotePath = `/for_${cfg.orgFolder}/glofas_pointdata_${cfg.orgFolder}_${datePart}00.tar.gz`;

          // Step 1.1: download tar.gz buffer via FTP
          this.logger.log(`[Fetch] [${cfg.stationId}] Downloading ${remotePath}`);
          const buffer = await this.ftpService.downloadFile(remotePath);

          // Step 1.2: extract files from tar.gz
          this.logger.log(`[Fetch] [${cfg.stationId}] Downloaded ${buffer.length} bytes, extracting`);
          const files = await extractTarGz(buffer);

          let dischargeContent: string | undefined;
          let returnLevelContent: string | undefined;
          let dischargeFile: string | undefined;

          // Step 1.3: identify discharge series and return levels files
          for (const [name, content] of files.entries()) {
            if (name.includes('glofas_discharge_') && !name.includes('returnlevels')) {
              dischargeContent = content; dischargeFile = name;
            } else if (name.includes('glofas_returnlevels_')) {
              returnLevelContent = content;
            }
          }

          if (!dischargeContent || !returnLevelContent) {
            throw new Error(`Missing required files in tar.gz for station ${cfg.stationId}`);
          }

          // Step 1.4: derive forecast date from filename, fall back to today
          let forecastDate = dateString;
          if (dischargeFile) try { forecastDate = extractDateFromFilename(dischargeFile); } catch { /* use dateString */ }

          this.logger.log(`[Fetch] [${cfg.stationId}] Ready — forecastDate: ${forecastDate}`);

          return {
            dischargeContent,
            returnLevelContent,
            forecastDate,
            location: cfg.location,
            stationId: cfg.stationId,
          };
        }),
      );

      results.forEach((result, index) => {
        const station = config[index];
        if (!station) return;

        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          itemErrors.push({
            itemId: station.location,
            stage: 'fetch' as const,
            code: 'FETCH_FAILED',
            message: result.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          this.logger.warn(
            `Failed to fetch FTP data for ${station.location}: ${result.reason?.message}`,
          );
        }
      });

      this.logger.log(`[Fetch] Complete — ${successfulResults.length}/${config.length} stations succeeded`);

      if (successfulResults.length === 0) {
        return Err('All stations failed', null, {
          totalItems: config.length,
          successfulItems: 0,
          failedItems: config.length,
          itemErrors,
        });
      }

      return Ok(successfulResults, {
        totalItems: config.length,
        successfulItems: successfulResults.length,
        failedItems: itemErrors.length,
        itemErrors: itemErrors.length > 0 ? itemErrors : undefined,
      });
    } catch (error: any) {
      this.logger.error('Failed to fetch Glofas FTP data', error);
      return Err('Failed to fetch Glofas observations', error);
    }
  }

  aggregate(rawDatas: GlofasFetchResponse[]): Result<GlofasObservation[]> {
    try {
      const observations: GlofasObservation[] = [];

      this.logger.log(`[Aggregate] Processing ${rawDatas.length} station(s)`);

      for (const { dischargeContent, returnLevelContent, forecastDate, location, stationId } of rawDatas) {
        // Step 2: parse discharge series and return levels from file contents
        const dischargeRecords = parseDischargeSeries(dischargeContent);
        const returnLevels = parseReturnLevels(returnLevelContent);
        this.logger.log(`[Aggregate] [${stationId}] ${dischargeRecords.length} discharge records, ${returnLevels.length} return level entries`);

        // Step 2.1: match station return level thresholds by stationId
        const stationLevel = returnLevels.find((r) => r.stationId === stationId);
        if (!stationLevel) {
          this.logger.warn(`[${stationId}] Return level not found. Available: ${returnLevels.map((r) => r.stationId).join(', ')}`);
          continue;
        }

        // Step 2.2: filter discharge records for this station and compute exceedance probabilities
        const stationRecords = dischargeRecords.filter((r) => r.name.startsWith(stationId));
        this.logger.log(`[Aggregate] [${stationId}] ${stationRecords.length} records matched, computing probabilities`);
        const glofasData = this.computeObservation(stationRecords, stationLevel);
        this.logger.log(`[Aggregate] [${stationId}] alertLevel=${glofasData.pointForecastData.alertLevel.data} maxProbability=${glofasData.pointForecastData.maxProbability.data}`);

        observations.push({
          data: { ...glofasData, forecastDate },
          location,
        });
      }

      this.logger.log(`[Aggregate] Complete — ${observations.length} observation(s)`);
      return Ok(observations);
    } catch (error: any) {
      this.logger.error('Failed to aggregate Glofas data', error);
      return Err('Failed to aggregate Glofas data', error);
    }
  }

  transform(aggregatedData: GlofasObservation[]): Result<Indicator[]> {
    try {
      this.logger.log(`[Transform] Shaping ${aggregatedData.length} observation(s) into indicators`);

      // Step 3: shape observations into standard Indicator objects
      const indicators: Indicator[] = aggregatedData.map((obs) => ({
        kind: 'OBSERVATION' as const,
        issuedAt: new Date().toISOString(),
        location: { type: 'BASIN' as const, basinId: obs.location },
        source: {
          key: obs.location,
          metadata: { originalUnit: 'percentage' },
        },
        info: obs.data,
        indicator: 'prob_flood',
        units: 'percentage',
        value: obs.data?.pointForecastData?.maxProbability?.data || '0 / 0 / 0',
      }));

      this.logger.log(`Transformed to ${indicators.length} indicators`);
      this.emitDataSourceEvent(indicators);
      return Ok(indicators);
    } catch (error: any) {
      this.logger.error('Failed to transform Glofas data', error);
      return Err('Failed to transform to indicators', error);
    }
  }

  async execute(): Promise<Result<Indicator[]>> {
    return chainAsync(this.fetch(), (rawData: GlofasFetchResponse[]) =>
      chainAsync(this.aggregate(rawData), (observations: GlofasObservation[]) =>
        this.transform(observations),
      ),
    );
  }

  private computeObservation(records: DischargeRecord[], levels: ReturnLevelRecord) {
    const peakByMember = new Map<number, number>();
    const byStep = new Map<string, number[]>();

    for (const r of records) {
      peakByMember.set(r.member, Math.max(peakByMember.get(r.member) ?? 0, r.dis));
      if (!byStep.has(r.time)) byStep.set(r.time, []);
      byStep.get(r.time)!.push(r.dis);
    }

    const peakPerMember = Array.from(peakByMember.values());
    const totalMembers = peakPerMember.length || 1;

    const [exceed2yr = 0, exceed5yr = 0, exceed20yr = 0] = [levels.level2yr, levels.level5yr, levels.level20yr]
      .map((l) => peakPerMember.filter((d) => d > l).length);

    const prob2yr = Math.round((exceed2yr / totalMembers) * 100);
    const prob5yr = Math.round((exceed5yr / totalMembers) * 100);
    const prob20yr = Math.round((exceed20yr / totalMembers) * 100);

    const peakDis = Math.max(...peakPerMember);
    const alertLevel = this.getAlertLevel(prob2yr, prob5yr, prob20yr);
    const maxProbStep = this.getMaxProbStep(records, levels.level2yr, totalMembers);

    const rpHeaders = ['Date', 'Min', 'Mean', 'Max', '2yr RP', '5yr RP', '20yr RP'];
    const rpData = Array.from(byStep.entries())
      .slice(0, 10)
      .map(([date, vals]) => {
        const min = Math.min(...vals).toFixed(1);
        const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
        const max = Math.max(...vals).toFixed(1);
        return [date, min, mean, max, levels.level2yr, levels.level5yr, levels.level20yr];
      });

    return {
      pointForecastData: {
        maxProbability: { header: 'Maximum probability', data: `${prob2yr} / ${prob5yr} / ${prob20yr}` },
        alertLevel: { header: 'Alert level', data: alertLevel },
        peakForecasted: { header: 'Peak discharge (m³/s)', data: peakDis.toFixed(1) },
        maxProbabilityStep: { header: 'Max probability step', data: maxProbStep },
      },
      returnPeriodTable: { returnPeriodHeaders: rpHeaders, returnPeriodData: rpData },
    };
  }

  private getAlertLevel(prob2yr: number, prob5yr: number, prob20yr: number): string {
    if (prob20yr >= 30) return 'Red';
    if (prob5yr >= 30) return 'Orange';
    if (prob2yr >= 30) return 'Yellow';
    return 'None';
  }

  private getMaxProbStep(records: DischargeRecord[], threshold: number, totalMembers: number): string {
    const exceedanceByStep = new Map<string, number>();

    for (const r of records) {
      if (r.dis > threshold) {
        exceedanceByStep.set(r.time, (exceedanceByStep.get(r.time) ?? 0) + 1);
      }
    }

    let maxProb = 0;
    let maxStep = '';
    for (const [step, count] of exceedanceByStep.entries()) {
      const prob = count / totalMembers;
      if (prob > maxProb) { maxProb = prob; maxStep = step; }
    }

    return maxStep;
  }

  private emitDataSourceEvent(indicators: Indicator[]): void {
    if (!this.eventEmitter || indicators.length === 0) return;

    const payload: DataSourceEventPayload = {
      dataSource: DataSource.GLOFAS,
      sourceType: SourceType.WATER_LEVEL,
      indicators,
      fetchedAt: new Date().toISOString(),
    };

    this.eventEmitter.emit(DATA_SOURCE_EVENTS.GLOFAS.WATER_LEVEL, payload);
  }
}
