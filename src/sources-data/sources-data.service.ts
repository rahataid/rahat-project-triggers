import { Injectable } from '@nestjs/common';
import {
  CreateSourcesDataDto,
  GlofasStationInfo,
  UpdateSourcesDataDto,
} from './dto';
import { paginator, PaginatorTypes, PrismaService } from '@rumsan/prisma';
import { PaginationDto } from 'src/common/dto';
import { DateTime } from 'luxon';
import { HttpService } from '@nestjs/axios';
const paginate: PaginatorTypes.PaginateFunction = paginator({ perPage: 10 });
@Injectable()
export class SourcesDataService {
  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}
  create(dto: CreateSourcesDataDto) {
    return this.prisma.sourcesData.create({
      data: {
        ...dto,
      },
    });
  }

  findAll(appId: string, dto: PaginationDto) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[dto.sort] = dto.order;
    return paginate(
      this.prisma.sourcesData,
      {
        where: {
          app: appId,
        },
        orderBy,
      },
      {
        page: dto.page,
        perPage: dto.perPage,
      },
    );
  }

  findOne(uuid: string) {
    return this.prisma.sourcesData.findUnique({
      where: {
        uuid,
      },
    });
  }

  update(uuid: string, dto: UpdateSourcesDataDto) {
    return this.prisma.sourcesData.update({
      where: {
        uuid,
      },
      data: dto,
    });
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

  sortByDate(data: any[]) {
    return data.sort(
      (a, b) =>
        new Date(b.waterLevelOn).valueOf() - new Date(a.waterLevelOn).valueOf(),
    );
  }

  compareWaterLevels(currentLevel: number, threshold: number) {
    if (currentLevel >= threshold) {
      return true;
    }
    return false;
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
