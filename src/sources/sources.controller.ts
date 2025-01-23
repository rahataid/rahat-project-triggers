import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSourceDto } from './dto/create-source.dto';
import { SourcesService } from './sources.service';
import { ApiHeader } from '@nestjs/swagger';
import { AppId } from '@rumsan/app';
import { PaginationDto } from 'src/common/dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}
  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Post()
  create(@AppId() appId: string, @Body() dto: CreateSourceDto) {
    return this.sourcesService.create(appId, dto);
  }

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.sourcesService.findAll(appId, dto);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.sourcesService.findOne(uuid);
  }
  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(uuid, dto);
  }
}
