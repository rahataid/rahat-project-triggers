import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForecastService } from './forecast.service';

@Controller('forecast')
@ApiTags('Forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('river')
  getRiverForecast() {
    return this.forecastService.getRiverForecast();
  }

  @Get('glofas')
  async getGlofasForecast(@Query() query: any) {
    return this.forecastService.getGlofasForecast(query);
  }

  @Post('gauges:searchGaugesByArea')
  @ApiOperation({
    description: 'Fetch GFH gauges within a specified area.',
  })
  async getGFHGauges(@Body() body: any) {
    return this.forecastService.getGFHGauges();
  }

  @Get('gaugeModels:batchGet')
  @ApiOperation({
    description: 'Fetch GFH gauge metadata.',
  })
  async getGFHGaugeMetadata(@Query() query: any) {
    return this.forecastService.getGFHGaugeMetadata();
  }

  @Get('gauges:queryGaugeForecasts')
  @ApiOperation({
    description: 'Fetch GFH gauge forecasts.',
  })
  async getGFHGaugeForecast(@Query() query: any) {
    return this.forecastService.getGFHGaugeForecast();
  }
}
