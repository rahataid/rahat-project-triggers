import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { DailyMonitoringService } from './daily-monitoring.service';
import {
  CreateDailyMonitoringDto,
  ListDailyMonitoringDto,
  UpdateDailyMonitoringDto,
} from './dto';

@Controller('daily-monitoring')
export class DailyMonitoringController {
  constructor(
    private readonly dailyMonitoringService: DailyMonitoringService,
  ) {}

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  // create(@AppId() appId: string, @Body() dto: CreateDailyMonitoringDto) {
  //   return this.dailyMonitoringService.create(appId, dto);
  // }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  // findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
  //   return this.dailyMonitoringService.findAll(appId, dto);
  // }

  // @Get(':uuid')
  // findOne(@Param('uuid') uuid: string) {
  //   return this.dailyMonitoringService.findOne(uuid);
  // }

  // @Patch(':uuid')
  // update(@Param('uuid') uuid: string, @Body() dto: UpdateDailyMonitoringDto) {
  //   return this.dailyMonitoringService.update(uuid, dto);
  // }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.ADD,
    uuid: process.env.PROJECT_ID,
  })
  async add(payload: CreateDailyMonitoringDto) {
    return this.dailyMonitoringService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ALL,
    uuid: process.env.PROJECT_ID,
  })
  async getAll(payload: ListDailyMonitoringDto): Promise<any> {
    return this.dailyMonitoringService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ONE,
    uuid: process.env.PROJECT_ID,
  })
  async getOne(payload: { uuid: string }) {
    return this.dailyMonitoringService.findOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.UPDATE,
    uuid: process.env.PROJECT_ID,
  })
  async update(payload: UpdateDailyMonitoringDto) {
    return this.dailyMonitoringService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.REMOVE,
    uuid: process.env.PROJECT_ID,
  })
  async remove(payload: { uuid: string }) {
    return this.dailyMonitoringService.remove(payload);
  }
}
