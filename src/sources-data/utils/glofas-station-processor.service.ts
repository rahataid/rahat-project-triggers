import { Injectable, Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { getFormattedDate, parseGlofasData } from 'src/common';
import { GlofasStationInfo } from '../dto';
import { GlofasService } from '../glofas.service';
import { SourcesDataService } from '../sources-data.service';
import { HealthError } from './health-utils.service';

@Injectable()
export class GlofasStationProcessorService {
  private readonly logger = new Logger(GlofasStationProcessorService.name);

  constructor(
    private readonly glofasService: GlofasService,
    private readonly sourceService: SourcesDataService,
  ) {}

  /**
   * Process a single Glofas station
   */
  async processGlofasStation(
    glofasStation: GlofasStationInfo,
    errors: HealthError[],
  ): Promise<boolean> {
    try {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const { dateString, dateTimeString } = getFormattedDate(yesterdayDate);

      const riverBasin = glofasStation.LOCATION;

      // Check if data already exists
      const hasExistingRecord = await this.glofasService.findGlofasDataByDate(
        riverBasin,
        dateString,
      );

      if (hasExistingRecord) {
        this.logger.log(
          `GLOFAS: Data for ${riverBasin} on ${dateString} already exists.`,
        );
        return true;
      }

      this.logger.log(
        `GLOFAS: Fetching data for ${riverBasin} on ${dateString}`,
      );

      // Fetch station data
      const stationData = await this.glofasService.getStationData({
        ...glofasStation,
        TIMESTRING: dateTimeString,
      });

      if (!stationData?.content?.['Reporting Points']?.point) {
        errors.push({
          code: 'GLOFAS_NO_DATA',
          message: `No reporting points data found for ${riverBasin}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      // Parse the data
      const reportingPoints = stationData.content['Reporting Points'].point;
      const glofasData = parseGlofasData(reportingPoints);

      this.logger.log(`GLOFAS: Parsed data for ${riverBasin} on ${dateString}`);

      // Save the data
      const result = await this.sourceService.create({
        source: 'GLOFAS',
        riverBasin: riverBasin,
        type: SourceType.RAINFALL,
        info: { ...glofasData, forecastDate: dateString },
      });

      if (result) {
        this.logger.log(
          `GLOFAS: Data saved successfully for ${riverBasin} on ${dateString}`,
        );
        return true;
      } else {
        this.logger.warn(
          `GLOFAS: Failed to save data for ${riverBasin} on ${dateString}`,
        );
        errors.push({
          code: 'GLOFAS_SAVE_ERROR',
          message: `Failed to save data for ${riverBasin} on ${dateString}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      errors.push({
        code: 'GLOFAS_STATION_ERROR',
        message: `Error processing station ${glofasStation.LOCATION}: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(
        `GLOFAS: Error processing station ${glofasStation.LOCATION}:`,
        errorMessage,
      );
      return false;
    }
  }

  /**
   * Create processing tasks for Glofas stations
   */
  createGlofasTasks(glofasSettings: GlofasStationInfo[]): GlofasStationInfo[] {
    return glofasSettings;
  }
}
