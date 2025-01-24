import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { DailyMonitoringService } from './daily-monitoring.service';
import { CreateDailyMonitoringDto, UpdateDailyMonitoringDto } from './dto';
import { ApiHeader } from '@nestjs/swagger';
import { AppId } from '@rumsan/app';
import { PaginationDto } from 'src/common/dto';

@Controller('daily-monitoring')
export class DailyMonitoringController {
  constructor(
    private readonly dailyMonitoringService: DailyMonitoringService,
  ) {}

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Post()
  create(@AppId() appId: string, @Body() dto: CreateDailyMonitoringDto) {
    return this.dailyMonitoringService.create(appId, dto);
  }

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.dailyMonitoringService.findAll(appId, dto);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.dailyMonitoringService.findOne(uuid);
  }

  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateDailyMonitoringDto) {
    return this.dailyMonitoringService.update(uuid, dto);
  }
}
