import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, SourceType } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { BQUEUE, JOBS } from 'src/constant';
import {
  AddTriggerStatementDto,
  DhmDataObject,
  DHMWaterLevelInfo,
} from './dto';
import { AbstractSource } from './sources-data-abstract';
import { RpcException } from '@nestjs/microservices';
import {
  InputItem,
  NormalizedItem,
  RainfallStationData,
  RiverStationData,
} from 'src/types/data-source';
import { scrapeDataFromHtml } from 'src/common';
import {
  dhmRainfallWatchUrl,
  dhmRiverWatchUrl,
} from 'src/constant/datasourceUrls';
@Injectable()
export class DhmService implements AbstractSource {
  private readonly logger = new Logger(DhmService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private prisma: PrismaService,
    @InjectQueue(BQUEUE.TRIGGER) private readonly triggerQueue: Queue,
  ) {}

  async criteriaCheck(payload: AddTriggerStatementDto) {
    const {
      uuid,
      dataSource,
      riverBasin,
      isMandatory,
      phaseId,
      triggerStatement,
    } = payload;

    const triggerData = await this.prisma.trigger.findUnique({
      where: {
        uuid: uuid,
      },
      include: {
        phase: true,
      },
    });

    if (!triggerData || triggerData.isTriggered) return;

    let waterLevelReached = false;

    this.logger.log(`Criteria check for ${dataSource} started`);
    const recentData = await this.prisma.sourcesData.findFirst({
      where: {
        type: SourceType.WATER_LEVEL,
        source: {
          riverBasin,
          source: {
            has: DataSource.DHM,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentData) {
      this.logger.error(`${dataSource}:${riverBasin} : data not available`);
      return;
    }

    const recentWaterLevel = JSON.parse(
      JSON.stringify(recentData.info),
    ) as DHMWaterLevelInfo;

    const currentLevel = recentWaterLevel.waterLevel.value;

    this.logger.log('##### WATER LEVEL INFO ########');
    this.logger.log('Latest water level: ', recentWaterLevel.waterLevel);
    this.logger.log('##############################');

    // If trigger statement is for READNESS, We will chek for the warningLevel
    // If trigger statement is for ACTIVATION, We will chek for the dangerLevel

    if (triggerData.phase.name === 'READINESS') {
      waterLevelReached = this.compareWaterLevels(
        currentLevel,
        triggerStatement?.warningLevel,
      );
    }

    if (triggerData.phase.name === 'ACTIVATION') {
      waterLevelReached = this.compareWaterLevels(
        currentLevel,
        triggerStatement?.dangerLevel,
      );
    }

    if (waterLevelReached === false) {
      this.logger.log(
        `${dataSource}: ${riverBasin}: Water is in a safe level.`,
      );
      return;
    }

    if (isMandatory) {
      await this.prisma.phase.update({
        where: {
          uuid: phaseId,
        },
        data: {
          receivedMandatoryTriggers: {
            increment: 1,
          },
        },
      });
    } else {
      await this.prisma.phase.update({
        where: {
          uuid: phaseId,
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
        uuid: uuid,
      },
      data: {
        isTriggered: true,
      },
    });
    this.triggerQueue.add(JOBS.TRIGGER.REACHED_THRESHOLD, payload, {
      attempts: 3,
      removeOnComplete: true,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  compareWaterLevels(currentLevel: number, threshold: number) {
    if (currentLevel >= threshold) {
      return true;
    }
    return false;
  }

  async getRiverStations() {
    this.logger.log('Fetching river stations from DHM');
    try {
      // TODO: Need to add DHM variable in environment variable
      const dataSourceURL = this.configService.get('DHM');
      const riverStationsURL = `${dataSourceURL}/river-stations/?latest=true`;
      console.log(
        '🚀 ~ DhmService ~ getRiverStations ~ riverStationsURL:',
        riverStationsURL,
      );
      const stations = await this.getData(riverStationsURL);
      return stations.data;
    } catch (error) {
      this.logger.error(error);
      throw new RpcException('Failed to fetch river stations');
    }
  }

  async getRiverStationData(url: string, location: string): Promise<any> {
    const riverURL = new URL(`${url}/river`);
    const title = location;
    const intervals = this.getIntervals();
    const waterLevelOnGt = intervals.timeGT;
    const waterLevelOnLt = intervals.timeLT;

    riverURL.searchParams.append('title', title);
    riverURL.searchParams.append('historical', 'true');
    riverURL.searchParams.append('format', 'json');
    riverURL.searchParams.append('water_level_on__gt', waterLevelOnGt);
    riverURL.searchParams.append('water_level_on__lt', waterLevelOnLt);
    riverURL.searchParams.append(
      'fields',
      'id,created_on,title,basin,point,image,water_level,danger_level,warning_level,water_level_on,status,steady,description,station',
    );
    riverURL.searchParams.append('limit', '-1');

    return this.httpService.axiosRef.get(riverURL.href);
  }

  async getData(url: string): Promise<any> {
    return await this.httpService.axiosRef.get(url);
  }

  getIntervals() {
    const now = DateTime.now().setZone('Asia/Kathmandu');
    const pastThree = now.minus({ days: 1 });

    const midnightToday = now.set({ hour: 23, minute: 59, second: 59 }).toISO();
    const startPastThree = pastThree
      .set({ hour: 0, minute: 0, second: 0 })
      .toISO();

    return {
      timeGT: startPastThree,
      timeLT: midnightToday,
    };
  }

  sortByDate(data: DhmDataObject[]) {
    return data.sort(
      (a, b) =>
        new Date(b.waterLevelOn).valueOf() - new Date(a.waterLevelOn).valueOf(),
    );
  }

  async saveDataInDhm(
    type: SourceType,
    riverBasin: string,
    payload: RiverStationData | RainfallStationData,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingRecord = await tx.sourcesData.findFirst({
          where: {
            type,
            dataSource: DataSource.DHM,
            source: {
              riverBasin,
            },
          },
        });

        if (existingRecord) {
          return await tx.sourcesData.update({
            where: { id: existingRecord.id },
            data: {
              info: {
                ...(existingRecord.info &&
                  JSON.parse(JSON.stringify(existingRecord.info))),
                ...JSON.parse(JSON.stringify(payload)),
              },
              updatedAt: new Date(),
            },
          });
        } else {
          return await tx.sourcesData.create({
            data: {
              type,
              dataSource: DataSource.DHM,
              info: JSON.parse(JSON.stringify(payload)),
              source: {
                connectOrCreate: {
                  where: {
                    riverBasin,
                  },
                  create: {
                    source: [DataSource.DHM],
                    riverBasin,
                  },
                },
              },
            },
          });
        }
      });
    } catch (err) {
      this.logger.error(`Error saving data for ${riverBasin}:`, err);
      throw err;
    }
  }

  async getDhmRiverWatchData(payload: {
    date: string;
    period: string;
    seriesid: string;
    location: string;
  }): Promise<{ [key: string]: any }[]> {
    const { date, period, seriesid, location } = payload;

    const form = new FormData();
    form.append('date', date);
    form.append('period', period);
    form.append('seriesid', seriesid);

    try {
      const {
        data: { data },
      } = await this.httpService.axiosRef.post(dhmRiverWatchUrl, form);

      const sanitizedData = scrapeDataFromHtml(data.table);

      if (!sanitizedData || sanitizedData.length === 0) {
        this.logger.warn(`No history data returned for ${location}`);
        return;
      }
      return sanitizedData;
    } catch (e) {
      this.logger.log(
        `Error fetching river watch by series id: ${seriesid}`,
        e,
      );
    }
  }

  async getDhmRainfallWatchData(payload: {
    date: string;
    period: string;
    seriesid: string;
    location: string;
  }): Promise<{ [key: string]: any }[]> {
    const { date, period, seriesid, location } = payload;

    const form = new FormData();
    form.append('date', date);
    form.append('period', period);
    form.append('seriesid', seriesid);

    try {
      const {
        data: { data },
      } = await this.httpService.axiosRef.post(dhmRainfallWatchUrl, form);

      const sanitizedData = scrapeDataFromHtml(data.table);

      if (!sanitizedData || sanitizedData.length === 0) {
        this.logger.warn(`No history data returned for ${location}`);
        return;
      }
      return sanitizedData;
    } catch (e) {
      this.logger.log(
        `Error fetching rainfall watch by series id: ${seriesid}`,
        e,
      );
    }
  }

  async normalizeDhmRiverAndRainfallWatchData(
    dataArray: InputItem[],
  ): Promise<NormalizedItem[]> {
    return dataArray.map((item) => {
      const base = {
        datetime: item.Date,
      };

      if ('Point' in item) {
        return {
          ...base,
          value: item.Point,
        };
      }

      if ('Average' in item && 'Max' in item && 'Min' in item) {
        return {
          ...base,
          value: item.Average,
          max: item.Max,
          min: item.Min,
        };
      }

      if ('Total' in item && 'Hourly' in item) {
        return {
          ...base,
          value: item.Total,
          min: Math.min(item.Hourly, item.Total),
          max: Math.max(item.Hourly, item.Total),
        };
      }

      if ('Total' in item && 'Daily' in item) {
        return {
          ...base,
          value: item.Total,
          min: Math.min(item.Daily, item.Total),
          max: Math.max(item.Daily, item.Total),
        };
      }

      throw new Error('Invalid data format');
    });
  }
}
