import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { AppId } from '@rumsan/app';
import { PaginationDto } from 'src/common/dto';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { PhasesService } from './phases.service';
import { PhasesStatsService } from './phases.stats.service';

@Controller('phases')
export class PhasesController {
  constructor(
    private readonly phasesService: PhasesService,
    private readonly phasesStatsService: PhasesStatsService,
  ) {}

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Post()
  create(@AppId() appId: string, @Body() dto: CreatePhaseDto) {
    return this.phasesService.create(appId, dto);
  }

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Post('revertPhase')
  async revertPhase(@AppId() appId: string, @Body() dto: CreatePhaseDto) {
    return this.phasesService.revertPhase(appId, dto);
  }
  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.phasesService.findAll(appId, dto);
  }

  @Get('stats')
  async getStats() {
    return this.phasesStatsService.getStats();
  }
  @Get(':uuid')
  getOne(@Param('uuid') uuid: string) {
    return this.phasesService.getOne(uuid);
  }

  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() updatePhaseDto: UpdatePhaseDto) {
    return this.phasesService.update(uuid, updatePhaseDto);
  }
}
