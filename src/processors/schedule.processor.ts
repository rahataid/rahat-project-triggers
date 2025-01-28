import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { Job } from 'bull';
// import { BQUEUE, JOBS } from '../constants';
// import { AddTriggerStatement } from '../dto';
// import { DhmService } from '../datasource/dhm.service';
// import { GlofasService } from '../datasource/glofas.service';
import { DataSource } from '@prisma/client';
import { DhmService } from 'src/sources-data/dhm.service';
import { GlofasService } from 'src/sources-data/glofas.service';
import { BQUEUE, JOBS } from 'src/constant';
import { CreateTriggerDto } from 'src/trigger/dto';

@Processor(BQUEUE.SCHEDULE)
export class ScheduleProcessor {
  private readonly logger = new Logger(ScheduleProcessor.name);

  constructor(
    private readonly dhmService: DhmService,
    private readonly glofasService: GlofasService,
  ) {}

  @Process(JOBS.SCHEDULE.ADD)
  async processAddSchedule(job: Job<CreateTriggerDto>) {
    // console.log('job', job.data);

    switch (job.data.dataSource) {
      case DataSource.DHM:
        await this.dhmService.criteriaCheck(job.data);
        break;
      case DataSource.GLOFAS:
        await this.glofasService.criteriaCheck(job.data);
        break;
      default:
      // do nothing
    }
  }
}
