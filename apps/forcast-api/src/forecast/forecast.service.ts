import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { demoRiverForecast } from 'src/data/dhm';
import { PrismaService } from '@lib/database';
import { glofasRawResponseTemplate } from '../data/glofas/raw-response';
import { DataSourceSettings } from '../types/data-source';
import { parseDate } from '../utils/date';
import {
  generateGFHForecastResponse,
  generateGFHGaugeMetadataResponse,
  gfhGauges,
} from 'src/data/gfh';

@Injectable()
export class ForecastService {
  logger = new Logger(ForecastService.name);
  constructor(private readonly prisma: PrismaService) {}

  private riverForecast = demoRiverForecast;
  private glofasForecast = glofasRawResponseTemplate;

  async getRiverForecast(): Promise<any> {
    this.logger.log('Fetching river forecast');
    return new Promise((resolve, reject) => {
      const shouldFail = Math.random() < 0.1; // 10% chance to fail
      setTimeout(() => {
        if (shouldFail) {
          this.logger.error('Failed to fetch river forecast');
          // Reject with a proper HttpException so Nest can return the provided message
          reject(
            new HttpException(
              { message: 'Network error: failed to fetch river forecast' },
              HttpStatus.SERVICE_UNAVAILABLE,
            ),
          );
        } else {
          resolve(this.riverForecast);
        }
      }, 1000);
    });
  }

  async getGlofasForecast(query: any) {
    this.logger.log('Fetching GloFAS forecast');
    try {
      const glofasSettings = await this.prisma.setting.findUnique({
        where: { name: 'DATASOURCE' },
      });

      if (!glofasSettings) {
        this.logger.warn('No GloFAS settings found, using default response');
        return 'No data';
      }

      const gfhArray = glofasSettings.value as DataSourceSettings;

      const gfhStationData = gfhArray?.GLOFAS?.[0];

      const dynamicResponse = this.generateDynamicGlofasResponse(
        gfhStationData,
        query,
      );

      this.logger.log('Returning dynamic GloFAS forecast data');
      return dynamicResponse;
    } catch (error) {
      this.logger.error(
        'Error fetching GloFAS settings, using default response',
        error,
      );
    }
  }

  private generateDynamicGlofasResponse(glofasData: any, query?: any) {
    const template = glofasRawResponseTemplate;

    const replacements: Record<string, string> = {
      stationId: `glofasData.STATION_ID`,
      country: 'Nepal',
      basin: 'Na',
      river: 'Doda',
      longitude: '80.434',
      latitude: '28,853',
      stationName: glofasData.LOCATION,
      forecastDate: parseDate(query?.TIME),
      probability: glofasData.PROBABILITY,
    };

    let dynamicHTML = template;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      dynamicHTML = dynamicHTML.replace(regex, String(value));
    }

    return {
      content: {
        'Reporting Points': {
          layer_name_index: 'Reporting Points',
          point: dynamicHTML,
          name: `G10165; Basin: Nepal; Station: Na;;`,
        },
      },
    };
  }

  async getGFHGauges() {
    this.logger.log('Fetching GFH Gauges');
    return gfhGauges;
  }

  private async getGFHConfig() {
    this.logger.log('Fetching GFH Data Source Configuration');
    try {
      const dataSourceSettings = await this.prisma.setting.findUnique({
        where: { name: 'DATASOURCE' },
      });

      if (!dataSourceSettings) {
        const message = 'Data source settings not found';
        this.logger.warn(message);
        return { error: message };
      }

      const gfhConfig = (dataSourceSettings.value as DataSourceSettings)
        .GFH?.[0];

      if (!gfhConfig) {
        const message = 'GFH configuration not found';
        this.logger.warn(message);
        return { error: message };
      }

      return { gfhConfig };
    } catch (err) {
      this.logger.error('Error fetching GFH configuration', err);
      return { error: 'Internal error while fetching GFH configuration' };
    }
  }

  async getGFHGaugeMetadata() {
    this.logger.log('Fetching GFH Gauge Metadata');
    try {
      const { gfhConfig, error } = await this.getGFHConfig();
      if (error) return { data: null, message: error };

      return generateGFHGaugeMetadataResponse(gfhConfig);
    } catch (err) {
      this.logger.error('Error generating GFH gauge metadata', err);
      return { data: null, message: 'Failed to fetch gauge metadata' };
    }
  }

  async getGFHGaugeForecast() {
    this.logger.log('Fetching GFH Gauge Forecast');
    try {
      const { gfhConfig, error } = await this.getGFHConfig();
      if (error) return { data: null, message: error };

      return generateGFHForecastResponse(gfhConfig);
    } catch (err) {
      this.logger.error('Error generating GFH gauge forecast', err);
      return { data: null, message: 'Failed to fetch gauge forecast' };
    }
  }
}
