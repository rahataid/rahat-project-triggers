import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import {
  GetAllGlofasProbFloodDto,
  GetOneGlofasProbFloodDto,
  GetSouceDataDto,
  GetTemperatureSourceDataDto,
} from './dto/get-source-data';
import { SourcesDataService } from './sources-data.service';
import { GetSeriesDto } from './dto/get-series';
import { GetDhmSingleSeriesDto, GetDhmSingleSeriesTemperatureDto } from './dto/get-dhm-single-series.dto';
import { DataSource } from '@lib/database';

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
    cmd: MS_TRIGGERS_JOBS.PROB_FLOOD.GET_ALL_GLOFAS,
  })
  async getAllGlofasProbFlood(payload: GetAllGlofasProbFloodDto): Promise<any> {
    return this.sourceDataService.getAllGlofasProbFlood(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.PROB_FLOOD.GET_ONE_GLOFAS,
  })
  async getOneGlofasProbFlood(payload: GetOneGlofasProbFloodDto): Promise<any> {
    return this.sourceDataService.getOneGlofasProbFlood(payload);
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
    payload.source = DataSource.DHM;
    return this.sourceDataService.getRainfallLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.WATER_LEVELS.GET_DHM_SINGLE_SERIES,
  })
  async getOneDhmSeriesWaterLevels(payload: GetDhmSingleSeriesDto) {
    return this.sourceDataService.getOneDhmSeriesWaterLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TEMPERATURE.GET_DHM,
  })
  async getDhmTemperature(payload: GetTemperatureSourceDataDto): Promise<any> {
    payload.source = DataSource.DHM;
    return this.sourceDataService.getTemperatureDhmLevels(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.TEMPERATURE.GET_DHM_SINGLE_SERIES,
  })
  async getOneDhmSeriesTemperature(payload: GetDhmSingleSeriesTemperatureDto) {
    return this.sourceDataService.getOneDhmSeriesTemperature(payload);
  }
}
