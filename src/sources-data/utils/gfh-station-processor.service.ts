import { Injectable, Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { getFormattedDate } from 'src/common';
import { Gauge, StationLoacationDetails } from 'src/types/data-source';
import { GfhService } from '../gfh.service';
import { SourcesDataService } from '../sources-data.service';
import { HealthError } from './health-utils.service';

export interface GfhStationConfig {
  RIVER_BASIN: string;
  STATION_LOCATIONS_DETAILS: StationLoacationDetails[];
}

export interface GfhStationTask {
  riverBasin: string;
  stationDetails: StationLoacationDetails;
  dateString: string;
}

@Injectable()
export class GfhStationProcessorService {
  private readonly logger = new Logger(GfhStationProcessorService.name);

  constructor(
    private readonly gfhService: GfhService,
    private readonly sourceService: SourcesDataService,
  ) {}

  /**
   * Process a single GFH station
   */
  async processGfhStation(
    task: GfhStationTask,
    gauges: Gauge[],
    errors: HealthError[],
  ): Promise<boolean> {
    const { riverBasin, stationDetails, dateString } = task;
    const stationName = stationDetails.STATION_NAME;

    try {
      // Check if data already exists
      const hasExistingRecord = await this.sourceService.findGfhData(
        riverBasin,
        dateString,
        stationName,
      );

      if (hasExistingRecord?.length) {
        this.logger.log(
          `Global flood data for ${stationName} on ${dateString} already exists.`,
        );
        return true;
      }

      // Match stations to gauges
      const [stationGaugeMapping, uniqueGaugeIds] =
        this.gfhService.matchStationToGauge(gauges, stationDetails);

      // Process gauge data
      const gaugeDataCache =
        await this.gfhService.processGaugeData(uniqueGaugeIds);

      // Build final output
      const output = this.gfhService.buildFinalOutput(
        stationGaugeMapping,
        gaugeDataCache,
      );

      // Filter and process the output
      const [stationKey, stationData] = Object.entries(output)[0] || [];
      if (!stationKey || !stationData) {
        this.logger.warn(`No data found for station ${stationName}`);
        errors.push({
          code: 'GFH_NO_DATA',
          message: `No data found for station ${stationName}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      // Format the data
      const gfhData = this.gfhService.formateGfhStationData(
        dateString,
        stationData,
        stationName,
        riverBasin,
      );

      // Save the data in Global Flood Hub
      const result = await this.gfhService.saveDataInGfh(
        SourceType.WATER_LEVEL,
        riverBasin,
        gfhData,
      );

      if (result) {
        this.logger.log(
          `Global flood data saved successfully for ${stationName}`,
        );
        return true;
      } else {
        this.logger.warn(`Failed to save Global flood data for ${stationName}`);
        errors.push({
          code: 'GFH_SAVE_ERROR',
          message: `Failed to save data for station ${stationName}`,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      errors.push({
        code: 'GFH_STATION_ERROR',
        message: `Error processing station ${stationName}: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(
        `Error processing station ${stationName}:`,
        errorMessage,
      );
      return false;
    }
  }

  /**
   * Create processing tasks for GFH stations
   */
  createGfhTasks(gfhSettings: GfhStationConfig[]): GfhStationTask[] {
    const tasks: GfhStationTask[] = [];
    const { dateString } = getFormattedDate();

    for (const gfhStationDetails of gfhSettings) {
      for (const stationDetails of gfhStationDetails.STATION_LOCATIONS_DETAILS) {
        tasks.push({
          riverBasin: gfhStationDetails.RIVER_BASIN,
          stationDetails,
          dateString,
        });
      }
    }

    return tasks;
  }

  /**
   * Fetch all gauges for GFH processing
   */
  async fetchGauges(): Promise<Gauge[]> {
    try {
      const gauges = await this.gfhService.fetchAllGauges();

      if (gauges.length === 0) {
        throw new Error('No gauges found');
      }

      return gauges;
    } catch (error) {
      this.logger.error('Error fetching gauges:', error.message);
      throw error;
    }
  }
}
