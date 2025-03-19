import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { PhasesService } from './phases.service';
import { PhasesStatsService } from './phases.stats.service';

@Controller('phases')
export class PhasesController {
  constructor(
    private readonly phasesService: PhasesService,
    private readonly phasesStatsService: PhasesStatsService,
  ) {}

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  // create(@AppId() appId: string, @Body() dto: CreatePhaseDto) {
  //   return this.phasesService.create(appId, dto);
  // }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post('revertPhase')
  // async revertPhase(@AppId() appId: string, @Body() dto: CreatePhaseDto) {
  //   return this.phasesService.revertPhase(appId, dto);
  // }
  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  // findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
  //   return this.phasesService.findAll(appId, dto);
  // }

  // // todo getStats method  call statsservice which will be handle by microservice

  // // @Get('stats')
  // // async getStats() {
  // //   return this.phasesStatsService.getStats();
  // // }
  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get(':location')
  // getByLocation(@AppId() appId: string, @Param('location') location: string) {
  //   return this.phasesService.findByLocation(appId, location);
  // }
  // @Get(':uuid')
  // getOne(@Param('uuid') uuid: string) {
  //   return this.phasesService.getOne(uuid);
  // }

  // @Patch(':uuid')
  // update(@Param('uuid') uuid: string, @Body() updatePhaseDto: UpdatePhaseDto) {
  //   return this.phasesService.update(uuid, updatePhaseDto);
  // }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.CREATE,
    uuid: process.env.PROJECT_ID,
  })
  async create(payload) {
    console.log(payload);
    return this.phasesService.create(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ALL,
    uuid: process.env.PROJECT_ID,
  })
  async getAll(payload: any): Promise<any> {
    return this.phasesService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_ONE,
    uuid: process.env.PROJECT_ID,
  })
  async getOne(payload: any) {
    const { uuid } = payload;
    return this.phasesService.getOne(uuid);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.ADD_TRIGGERS,
    uuid: process.env.PROJECT_ID,
  })
  async addTriggers(payload) {
    return this.phasesService.addTriggersToPhases(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.REVERT_PHASE,
    uuid: process.env.PROJECT_ID,
  })
  async revertPhase(payload) {
    const { appId, ...rest } = payload;
    return this.phasesService.revertPhase(appId, rest);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PHASES.GET_BY_LOCATION,
    uuid: process.env.PROJECT_ID,
  })
  async getByLocation(payload) {
    return this.phasesService.findByLocation(payload.appId, payload.location);
  }

  // @MessagePattern({
  //   cmd: MS_TRIGGERS_JOBS.PHASES.GET_STATS,
  //   uuid: process.env.PROJECT_ID,
  // })
  // async getStats() {
  //   return this.phasesStatsService.getStats();
  // }
}
