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

const RISING_ARROW_IMAGE = 'https://global-flood.emergency.copernicus.eu/static/images/viewer/RisingArrow.gif';
const FALLING_ARROW_IMAGE = 'https://global-flood.emergency.copernicus.eu/static/images/viewer/FallingArrow.gif';

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

      this.logger.log(`[Fetch] Starting for ${config.length} station(s)`);

      // Step 1: fetch every available tar.gz from FTP for each configured station (full backlog, not just latest)
      const results = await Promise.allSettled(
        config.map(async (cfg) => {
          const dir = `/for_${cfg.orgFolder}`;
          const prefix = `glofas_pointdata_${cfg.orgFolder}_`;

          // Step 1.1: list FTP dir for all available files
          this.logger.log(`[Fetch] [${cfg.stationId}] Listing ${dir} for available files`);
          const allFiles = await this.ftpService.listFiles(dir, prefix);
          this.logger.log(`[Fetch] [${cfg.stationId}] Found ${allFiles.length} file(s)`);

          // Step 1.2: download + extract each file in sequence (FTP client is not safely shared across concurrent calls)
          const stationResults: GlofasFetchResponse[] = [];
          for (const file of allFiles) {
            const remotePath = `${dir}/${file}`;
            this.logger.log(`[Fetch] [${cfg.stationId}] Downloading ${remotePath}`);
            const buffer = await this.ftpService.downloadFile(remotePath);
            const extracted = await extractTarGz(buffer);

            let dischargeContent: string | undefined;
            let returnLevelContent: string | undefined;

            for (const [name, content] of extracted.entries()) {
              if (name.includes('glofas_discharge_') && !name.includes('returnlevels')) {
                dischargeContent = content;
              } else if (name.includes('glofas_returnlevels_')) {
                returnLevelContent = content;
              }
            }

            if (!dischargeContent || !returnLevelContent) {
              this.logger.warn(`[Fetch] [${cfg.stationId}] Missing required files in ${file}, skipping`);
              continue;
            }

            // Step 1.3: derive forecast date from the tar.gz filename (reliable), fall back to today
            let forecastDate = dateString;
            try { forecastDate = extractDateFromFilename(file); } catch { /* use dateString */ }

            stationResults.push({
              dischargeContent,
              returnLevelContent,
              forecastDate,
              location: cfg.location,
              stationId: cfg.stationId,
            });
          }

          if (stationResults.length === 0) {
            throw new Error(`No usable files in tar.gz for station ${cfg.stationId}`);
          }

          this.logger.log(`[Fetch] [${cfg.stationId}] Ready — ${stationResults.length} forecast date(s)`);
          return stationResults;
        }),
      );

      results.forEach((result, index) => {
        const station = config[index];
        if (!station) return;

        if (result.status === 'fulfilled') {
          successfulResults.push(...result.value);
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

      this.logger.log(`[Aggregate] Processing ${rawDatas.length} forecast file(s)`);

      // Step 2: group fetched files by station — each station may have a week's worth of forecast dates
      const byStation = new Map<string, GlofasFetchResponse[]>();
      for (const raw of rawDatas) {
        if (!byStation.has(raw.stationId)) byStation.set(raw.stationId, []);
        byStation.get(raw.stationId)!.push(raw);
      }

      for (const [stationId, stationFiles] of byStation.entries()) {
        const location = stationFiles[0]!.location;

        // Step 2.1: compute one result per forecast date, oldest first
        const sorted = [...stationFiles].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
        const perDate: { forecastDate: string; result: ReturnType<GlofasAdapter['computeObservation']> }[] = [];

        for (const { dischargeContent, returnLevelContent, forecastDate } of sorted) {
          const dischargeRecords = parseDischargeSeries(dischargeContent);
          const returnLevels = parseReturnLevels(returnLevelContent);

          const stationLevel = returnLevels.find((r) => r.stationId === stationId);
          if (!stationLevel) {
            this.logger.warn(`[${stationId}] Return level not found for ${forecastDate}. Available: ${returnLevels.map((r) => r.stationId).join(', ')}`);
            continue;
          }

          const stationRecords = dischargeRecords.filter((r) => r.name.startsWith(stationId));
          perDate.push({ forecastDate, result: this.computeObservation(stationRecords, stationLevel) });
        }

        if (perDate.length === 0) {
          this.logger.warn(`[Aggregate] [${stationId}] No usable forecast dates`);
          continue;
        }

        // Step 2.2: column grid = union of all step-dates across every forecast date (day-of-month, matches old WMS)
        const newestFirst = [...perDate].reverse();
        const allStepDates = Array.from(
          new Set(perDate.flatMap(({ result }) => Array.from(result.countsByDate2yr.keys()))),
        ).sort();
        const rpHeaders = ['Forecast Day', ...allStepDates.map((d) => String(new Date(d).getDate()))];

        const mergeRpTable = (key: 'countsByDate2yr' | 'countsByDate5yr' | 'countsByDate20yr') => ({
          returnPeriodHeaders: rpHeaders,
          returnPeriodData: newestFirst.map(({ forecastDate, result }) => [
            forecastDate,
            ...allStepDates.map((d) => result[key].get(d) ?? ""),
          ]),
        });

        const glofasData = {
          pointForecastData: newestFirst[0]!.result.pointForecastData,
          returnPeriodTable2yr: mergeRpTable('countsByDate2yr'),
          returnPeriodTable5yr: mergeRpTable('countsByDate5yr'),
          returnPeriodTable20yr: mergeRpTable('countsByDate20yr'),
        };

        const forecastDate = newestFirst[0]!.forecastDate;
        this.logger.log(`[Aggregate] [${stationId}] Merged ${perDate.length} date(s) — alertLevel=${glofasData.pointForecastData.alertLevel.data} maxProbability=${glofasData.pointForecastData.maxProbability.data}`);

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
        value: obs.data?.pointForecastData?.maxProbability?.data || "",
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
    const dischargeTendencyImage = this.getDischargeTendencyImage(byStep);

    // per-step exceedance counts keyed by exact ISO date — merged across forecast dates in aggregate()
    const countsByDate = (threshold: number) => {
      const counts = new Map<string, string>();
      for (const [date, vals] of byStep.entries()) {
        const count = vals.filter((d) => d > threshold).length;
        counts.set(date, count === 0 ? "" : String(count));
      }
      return counts;
    };

    return {
      pointForecastData: {
        maxProbability: { header: 'Maximum probability', data: `${prob2yr} / ${prob5yr} / ${prob20yr}` },
        alertLevel: { header: 'Alert level', data: alertLevel },
        peakForecasted: { header: 'Peak discharge (m³/s)', data: peakDis.toFixed(1) },
        maxProbabilityStep: { header: 'Max probability step', data: maxProbStep },
        dischargeTendencyImage: { header: 'Discharge tendency', data: dischargeTendencyImage },
      },
      countsByDate2yr: countsByDate(levels.level2yr),
      countsByDate5yr: countsByDate(levels.level5yr),
      countsByDate20yr: countsByDate(levels.level20yr),
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

  private getDischargeTendencyImage(byStep: Map<string, number[]>): string {
    const steps = Array.from(byStep.keys()).sort();
    if (steps.length < 2) return RISING_ARROW_IMAGE;

    const mean = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
    const first = mean(byStep.get(steps[0]!)!);
    const last = mean(byStep.get(steps[steps.length - 1]!)!);

    return last >= first ? RISING_ARROW_IMAGE : FALLING_ARROW_IMAGE;
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
