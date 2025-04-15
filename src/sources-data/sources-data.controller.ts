import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { GetSouceDataDto } from './dto/get-source-data';
import { SourcesDataService } from './sources-data.service';

@Controller('sources-data')
export class SourcesDataController {
  constructor(
    private readonly dhmService: DhmService,
    private readonly glofasService: GlofasService,
    private readonly sourceDataService: SourcesDataService,
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
  })
  async getAllSource() {
    return this.dhmService.getRiverStations();
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.RIVER_STATIONS.GET_DHM,
  })
  async getDhmStations() {
    return this.dhmService.getRiverStations();
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_DHM,
  })
  async getDhmWaterLevels(payload: GetSouceDataDto): Promise<any> {
    payload.source = 'DHM';
    return this.sourceDataService.getWaterLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_GLOFAS,
  })
  async getGlofasWaterLevels(payload: GetSouceDataDto): Promise<any> {
    payload.source = 'GLOFAS';
    return this.sourceDataService.getWaterLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.RAINFALL_LEVELS.GET_DHM,
  })
  async getDhmRainfallLevels(payload: GetSouceDataDto): Promise<any> {
    payload.source = 'DHM';
    return this.sourceDataService.getRainfallLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.RAINFALL_LEVELS.GET_GLOFAS,
  })
  async getGlofasRainfallLevels(payload: GetSouceDataDto): Promise<any> {
    payload.source = 'GLOFAS';
    return this.sourceDataService.getRainfallLevels(payload);
  }
}
