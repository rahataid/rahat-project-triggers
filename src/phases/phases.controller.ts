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

@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

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
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.phasesService.findAll(appId, dto);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.phasesService.findOne(uuid);
  }

  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() updatePhaseDto: UpdatePhaseDto) {
    return this.phasesService.update(uuid, updatePhaseDto);
  }
}
