import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { ApiHeader } from '@nestjs/swagger';
import { AppId } from '@rumsan/app';
import { PaginationDto } from 'src/common/dto';

@Controller('trigger')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Post()
  create(@AppId() appId: string, @Body() dto: CreateTriggerDto) {
    return this.triggerService.create(appId, dto);
  }

  @ApiHeader({
    name: 'app-id',
    description: 'Application ID',
    required: true,
  })
  @Get()
  findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
    return this.triggerService.findAll(appId, dto);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.triggerService.findOne(uuid);
  }
  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() dto: UpdateTriggerDto) {
    return this.triggerService.update(uuid, dto);
  }
}
