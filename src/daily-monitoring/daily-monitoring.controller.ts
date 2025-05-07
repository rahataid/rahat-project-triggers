import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { DailyMonitoringService } from './daily-monitoring.service';
import {
  AddDailyMonitoringDto,
  CreateDailyMonitoringDto,
  ListDailyMonitoringDto,
  UpdateDailyMonitoringDto,
} from './dto';

@Controller('daily-monitoring')
export class DailyMonitoringController {
  constructor(
    private readonly dailyMonitoringService: DailyMonitoringService,
  ) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.ADD,
  })
  async add(payload: AddDailyMonitoringDto) {
    return this.dailyMonitoringService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ALL,
  })
  async getAll(payload: ListDailyMonitoringDto): Promise<any> {
    return this.dailyMonitoringService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ONE,
  })
  async getOne(payload: { uuid: string }) {
    return this.dailyMonitoringService.findOne(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.UPDATE,
  })
  async update(payload: UpdateDailyMonitoringDto) {
    return this.dailyMonitoringService.update(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.REMOVE,
  })
  async remove(payload: { uuid: string }) {
    return this.dailyMonitoringService.remove(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.DAILY_MONITORING.DELETE,
  })
  async deleteByKeyAndGroup(payload: { uuid: string; id: number }) {
    return this.dailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey(
      payload,
    );
  }
}
