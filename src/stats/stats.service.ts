import { Injectable } from '@nestjs/common';
import { CreateStatDto } from './dto/create-stat.dto';
import { CommunicationService } from '@rumsan/communication/services/communication.client';
import { PrismaService } from '@rumsan/prisma';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StatsService {
  private communicationService: CommunicationService;

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    this.communicationService = new CommunicationService({
      baseURL: this.configService.get('COMMUNICATION_URL'),
      headers: {
        appId: this.configService.get('COMMUNICATION_APP_ID'),
      },
    });
  }
  async save(data: CreateStatDto) {
    data.name = data.name.toUpperCase();

    return this.prismaService.stats.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
  }

  getByGroup(
    group: string,
    select: { name?: boolean; data?: boolean; group?: boolean } | null = null,
  ) {
    return this.prismaService.stats.findMany({
      where: { group },
      select,
    });
  }

  findAll() {
    return this.prismaService.stats.findMany();
  }

  findOne(name: string) {
    return this.prismaService.stats.findUnique({
      where: { name },
    });
  }

  remove(name: string) {
    return this.prismaService.stats.delete({
      where: { name },
    });
  }
}
