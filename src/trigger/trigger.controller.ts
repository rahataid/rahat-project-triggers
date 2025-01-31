import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { CreateTriggerDto, GetTriggersDto, UpdateTriggerDto } from './dto';
import { ApiHeader } from '@nestjs/swagger';
import { AppId } from '@rumsan/app';

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
  findAll(@AppId() appId: string, @Query() dto: GetTriggersDto): any {
    return this.triggerService.getAll(appId, dto);
  }

  @Get(':repeatKey')
  getOne(@Param('repeatKey') repeatKey: string) {
    return this.triggerService.getOne(repeatKey);
  }
  @Patch(':uuid/activate')
  activateTrigger(@Param('uuid') uuid: string, @Body() dto: UpdateTriggerDto) {
    return this.triggerService.activateTrigger(uuid, dto);
  }

  @Delete(':repeatKey')
  remove(@Param('repeatKey') repeatKey: string) {
    return this.triggerService.remove(repeatKey);
  }
}
