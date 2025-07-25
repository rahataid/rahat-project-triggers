import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOBS } from 'src/constant';
import { StatsService } from './stat.service';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @MessagePattern({ cmd: JOBS.STATS.MS_TRIGGERS_STATS })
  findAll(@Payload() payload: any) {
    console.log('first', payload);
    return this.statsService.findAll(payload);
  }
}
