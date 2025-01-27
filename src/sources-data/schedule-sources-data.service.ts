import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SourcesDataService } from './sources-data.service';
import { Cron } from '@nestjs/schedule';
import { SettingsService } from '@rumsan/settings';

// const DATASOURCE = {
//   DHM: {
//     URL: 'https://bipadportal.gov.np/api/v1',
//     LOCATION: 'Karnali at Chisapani',
//   },
//   GLOFAS: {
//     I: '721',
//     J: '303',
//     URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
//     BBOX: '8753364.64714296,3117815.425733483,9092541.220653716,3456991.999244238',
//     LOCATION: 'Karnali at Chisapani',
//   },
// };
@Injectable()
export class ScheduleSourcesDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleSourcesDataService.name);

  constructor(private readonly sourceService: SourcesDataService) {}
  onApplicationBootstrap() {
    this.synchronizeDHM();
  }
  @Cron('0 0 * * * *')
  async synchronizeDHM() {
    try {
      this.logger.log('DHM: syncing every hour');

      const dhmSettings = SettingsService.get('DATASOURCE.DHM');
      // const dhmSettings = DATASOURCE.DHM;

      const location = dhmSettings['LOCATION'];
      const dhmURL = dhmSettings['URL'];
      const waterLevelResponse = await this.sourceService.getRiverStationData(
        dhmURL,
        location,
      );

      const waterLevelData = this.sourceService.sortByDate(
        waterLevelResponse.data.results as any[],
      );

      if (waterLevelData.length === 0) {
        this.logger.log(`DHM:${location}: Water level data is not available.`);
        return;
      }

      const recentWaterLevel = waterLevelData[0];
      return this.sourceService.create({
        source: 'DHM',
        location: location,
        info: { recentWaterLevel },
      });
    } catch (err) {
      this.logger.error('DHM Err:', err.message);
    }
  }
}
