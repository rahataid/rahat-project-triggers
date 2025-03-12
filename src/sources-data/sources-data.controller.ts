import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PaginationDto } from 'src/common/dto';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { SourcesDataService } from './sources-data.service';

@Controller('sources-data')
export class SourcesDataController {
  constructor(
    private readonly sourcesDataService: SourcesDataService,
    private readonly dhmService: DhmService,
    private readonly glofasService: GlofasService,
  ) {}

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  // create(@Body() dto: CreateSourcesDataDto) {
  //   return this.sourcesDataService.create(dto);
  // }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  // findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
  //   return this.sourcesDataService.findAll(appId, dto);
  // }

  // @Get(':uuid')
  // findOne(@Param('uuid') uuid: string) {
  //   return this.sourcesDataService.findOne(uuid);
  // }
  // @Patch(':uuid')
  // update(@Param('uuid') uuid: string, @Body() dto: UpdateSourcesDataDto) {
  //   return this.sourcesDataService.update(uuid, dto);
  // }
  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.RIVER_STATIONS.GET_DHM,
    uuid: process.env.PROJECT_ID,
  })
  async getDhmStations() {
    return this.dhmService.getRiverStations();
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_DHM,
    uuid: process.env.PROJECT_ID,
  })
  async getDhmWaterLevels(payload: PaginationDto): Promise<any> {
    return this.dhmService.getWaterLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_GLOFAS,
    uuid: process.env.PROJECT_ID,
  })
  async getGlofasWaterLevels() {
    return this.glofasService.getLatestWaterLevels();
  }
}
