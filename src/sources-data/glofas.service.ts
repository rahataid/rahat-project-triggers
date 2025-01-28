import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
// import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@rumsan/prisma';
import { SettingsService } from '@rumsan/settings';
import { Queue } from 'bull';
import { CreateTriggerDto } from 'src/trigger/dto';
// import { BQUEUE, EVENTS, JOBS } from '../constants';
// import { AbstractSource } from './datasource.abstract';
// import { GlofasDataObject, GlofasStationInfo } from './dto';
import { GlofasDataObject, GlofasStationInfo } from './dto';

import { AbstractSource } from './sources-data-abstract';
import { BQUEUE, EVENTS } from 'src/constant';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GlofasService implements AbstractSource {
  private readonly logger = new Logger(GlofasService.name);

  constructor(
    private readonly httpService: HttpService,
    private prisma: PrismaService,
    @InjectQueue(BQUEUE.TRIGGER) private readonly triggerQueue: Queue,
    private eventEmitter: EventEmitter2,
  ) {}

  async criteriaCheck(payload: CreateTriggerDto) {
    const triggerData = await this.prisma.trigger.findUnique({
      where: {
        uuid: payload.uuid,
      },
    });

    // do not process if it is already triggered
    if (triggerData.isTriggered) {
      this.logger.log(
        `Trigger with repeat key ${triggerData.repeatEvery} already triggered.`,
      );
      this.eventEmitter.emit(EVENTS.AUTOMATED_TRIGGERED, {
        repeatKey: triggerData.repeatKey,
      });
      return;
    }

    const dataSource = payload.dataSource;
    const location = payload.location;
    const probability = Number(payload.triggerStatement?.probability);

    this.logger.log(`${dataSource}: monitoring`);

    const recentData = await this.prisma.sourcesData.findFirst({
      where: {
        location,
        source: dataSource,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentData) {
      this.logger.error(`${dataSource}:${location} : data not available`);
      return;
    }

    const recentStationData = JSON.parse(
      JSON.stringify(recentData.info),
    ) as GlofasDataObject;
    const rpTable = recentStationData.returnPeriodTable;

    const maxLeadTimeDays = Number(payload?.triggerStatement?.maxLeadTimeDays);
    const latestForecastData = rpTable.returnPeriodData[0];

    const [latestForecastDay] = latestForecastData[0].split('-').slice(-1);
    const sanitizedForecastDay = Number(latestForecastDay);

    const minForecastDayIndex = rpTable.returnPeriodHeaders.indexOf(
      sanitizedForecastDay.toString(),
    );
    const maxForecastDayIndex = minForecastDayIndex + Number(maxLeadTimeDays);

    const indexRange = this.createRange(
      minForecastDayIndex + 1,
      maxForecastDayIndex,
    );

    const probabilityReached = this.checkProbability(
      indexRange,
      latestForecastData,
      probability,
    );

    if (probabilityReached) {
      if (payload.isMandatory) {
        await this.prisma.phase.update({
          where: {
            uuid: payload.phaseId,
          },
          data: {
            receivedMandatoryTriggers: {
              increment: 1,
            },
          },
        });
      }

      if (!payload.isMandatory) {
        await this.prisma.phase.update({
          where: {
            uuid: payload.phaseId,
          },
          data: {
            receivedOptionalTriggers: {
              increment: 1,
            },
          },
        });
      }

      await this.prisma.trigger.update({
        where: {
          uuid: payload.uuid,
        },
        data: {
          isTriggered: true,
          triggeredAt: new Date(),
        },
      });

      // this.triggerQueue.add(JOBS.TRIGGERS.REACHED_THRESHOLD, payload, {
      //   attempts: 3,
      //   removeOnComplete: true,
      //   backoff: {
      //     type: 'exponential',
      //     delay: 1000,
      //   },
      // });

      return;
    }
  }

  async getStationData(payload: GlofasStationInfo) {
    const glofasURL = new URL(payload.URL);

    const queryParams = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      FORMAT: 'image/png',
      TRANSPARENT: 'true',
      QUERY_LAYERS: 'reportingPoints',
      LAYERS: 'reportingPoints',
      INFO_FORMAT: 'application/json',
      WIDTH: '832',
      HEIGHT: '832',
      CRS: 'EPSG:3857',
      STYLES: '',
      BBOX: payload.BBOX,
      I: payload.I,
      J: payload.J,
      TIME: payload.TIMESTRING,
      // BBOX: '9914392.14877593,2400326.5202299603,12627804.736861974,5113739.108316004',
      // I: '108',
      // J: '341',
      // TIME: "2024-06-09T00:00:00"
    };

    for (const [key, value] of Object.entries(queryParams)) {
      glofasURL.searchParams.append(key, value);
    }

    return (await this.httpService.axiosRef.get(glofasURL.href)).data;
  }

  async saveGlofasStationData(location: string, payload: GlofasDataObject) {
    try {
      const recordExists = await this.prisma.sourcesData.findFirst({
        where: {
          source: 'GLOFAS',
          location: location,
          info: {
            path: ['forecastDate'],
            equals: payload.forecastDate,
          },
        },
      });

      if (!recordExists) {
        await this.prisma.sourcesData.create({
          data: {
            source: 'GLOFAS',
            location: location,
            info: JSON.parse(JSON.stringify(payload)),
          },
        });
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getLatestWaterLevels() {
    const glofasSettings = SettingsService.get(
      'DATASOURCE.GLOFAS',
    ) as GlofasStationInfo;
    return this.prisma.sourcesData.findFirst({
      where: {
        source: 'GLOFAS',
        location: glofasSettings.LOCATION,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  checkProbability(
    indexRange: number[],
    latestForecastData: any,
    probability: number,
  ) {
    for (const index of indexRange) {
      const forecastData = Number(latestForecastData[index]);

      if (forecastData && forecastData >= probability) {
        return true;
      }
    }
  }

  createRange(start: number, end: number) {
    const rangeArray = [];
    for (let i = start; i <= end; i++) {
      rangeArray.push(i);
    }
    return rangeArray;
  }

  async findGlofasDataByDate(location: string, forecastDate: string) {
    const recordExists = await this.prisma.sourcesData.findFirst({
      where: {
        source: 'GLOFAS',
        location: location,
        info: {
          path: ['forecastDate'],
          equals: forecastDate,
        },
      },
    });
    return recordExists;
  }
}
