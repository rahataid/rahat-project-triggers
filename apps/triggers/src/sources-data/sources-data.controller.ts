import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { GetSouceDataDto } from './dto/get-source-data';
import { SourcesDataService } from './sources-data.service';
import { GetSeriesDto } from './dto/get-series';
import { GetDhmSingleSeriesDto } from './dto/get-dhm-single-series.dto';

@Controller('sources-data')
export class SourcesDataController {
  constructor(private readonly sourceDataService: SourcesDataService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.SOURCE_DATA.GET_SERIES_BY_DATA_SOURCE,
  })
  async getSeriesByDataSource(payload: GetSeriesDto) {
    return this.sourceDataService.findSeriesByDataSource(payload);
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
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_GFH,
  })
  async getGfhWaterLevels(payload: GetSouceDataDto): Promise<any> {
    payload.source = 'GFH';
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
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_DHM_SINGLE_SERIES,
  })
  async getOneDhmSeriesWaterLevels(payload: GetDhmSingleSeriesDto) {
    return this.sourceDataService.getOneDhmSeriesWaterLevels(payload);
  }
}
