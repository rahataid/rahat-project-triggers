import { Injectable } from '@nestjs/common';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
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
}
