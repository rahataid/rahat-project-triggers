import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from '@prisma/client';
import { PaginatorTypes, PrismaService, paginator } from '@rumsan/prisma';
import { SettingsService } from '@rumsan/settings';
import { Queue } from 'bull';
import { DateTime } from 'luxon';
import { BQUEUE, JOBS } from 'src/constant';
import { AddTriggerStatementDto, DhmDataObject } from './dto';
import { AbstractSource } from './sources-data-abstract';
import { SourcesDataService } from './sources-data.service';
import { PaginationDto } from 'src/common/dto';
import { RpcException } from '@nestjs/microservices';

const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 20 });

@Injectable()
export class DhmService implements AbstractSource {
  private readonly logger = new Logger(DhmService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly sourceDataService: SourcesDataService,
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
    });
    // do not process if it is already triggered
    if (triggerData.isTriggered) return;

    this.logger.log(`${dataSource}: monitoring`);

    const recentData = await this.prisma.sourcesData.findFirst({
      where: {
        source: {
          riverBasin,
          source: dataSource,
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
    ) as DhmDataObject;
    const currentLevel = recentWaterLevel.waterLevel;

    this.logger.log('##### WATER LEVEL INFO ########');
    this.logger.log('Latest water level: ', recentWaterLevel);
    this.logger.log('##############################');

    const waterLevelReached = this.compareWaterLevels(
      currentLevel,
      triggerStatement?.waterLevel,
    );

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
    }

    if (!isMandatory) {
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

  async getWaterLevels(payload: PaginationDto) {
    this.logger.log('Fetching water levels from DHM');
    try {
      const { page, perPage } = payload;
      const dhmSettings = SettingsService.get('DATASOURCE.DHM');
      const location = dhmSettings['LOCATION'];
      return paginate(
        this.prisma.sourcesData,
        {
          where: {
            source: {
              source: DataSource.DHM,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        {
          page,
          perPage,
        },
      );
    } catch (error) {
      this.logger.error(`Error while getting water levels: ${error}`);
      throw new RpcException('Failed to fetch water levels');
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
  async saveWaterLevelsData(riverBasin: string, payload: DhmDataObject) {
    try {
      const recordExists = await this.prisma.sourcesData.findFirst({
        where: {
          source: {
            source: 'DHM',
            riverBasin,
          },
          info: {
            path: ['waterLevelOn'],
            equals: payload.waterLevelOn,
          },
        },
      });
      if (!recordExists) {
        await this.sourceDataService.create({
          source: DataSource.GLOFAS,
          riverBasin: riverBasin,
          info: JSON.parse(JSON.stringify(payload)),
        });
        // await this.prisma.sourcesData.create({
        //   data: {
        //     source: 'DHM',
        //     location: location,
        //     info: JSON.parse(JSON.stringify(payload)),
        //   },
        // });
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}
