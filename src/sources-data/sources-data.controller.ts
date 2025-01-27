import {
  Controller,
  Get,
  // Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { CreateSourcesDataDto, UpdateSourcesDataDto } from './dto';
import { PaginationDto } from 'src/common/dto';
import { AppId } from '@rumsan/app';
import { ApiHeader } from '@nestjs/swagger';

@Controller('sources-data')
export class SourcesDataController {
  constructor(private readonly sourcesDataService: SourcesDataService) {}

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  create(@Body() dto: CreateSourcesDataDto) {
    return this.sourcesDataService.create(dto);
  }

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.sourcesDataService.findAll(appId, dto);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.sourcesDataService.findOne(uuid);
  }
  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateSourcesDataDto) {
    return this.sourcesDataService.update(uuid, dto);
  }
}
