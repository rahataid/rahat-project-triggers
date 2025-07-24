import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOBS } from 'src/constant';
import { StatsService } from './stat.service';

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // @MessagePattern({ cmd: JOBS.STATS.GET_STATS })
  // findAll(@Payload() payload: any) {
  //   console.log('first', payload);
  //   return this.statsService.findAll(payload);
  // }

  @MessagePattern({ cmd: 'rahat.jobs.ms.trigggers.stats' })
  findAll(@Payload() payload: any) {
    console.log('first', payload);
    return this.statsService.findAll(payload);
  }

  //

  // @MessagePattern({ cmd: JOBS.STATS.GET_ONE, uuid: process.env.PROJECT_ID })
  // findOne(payload) {
  //   return this.statsService.findOne(payload);
  // }
}
