import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DataSource, SourceType } from '@prisma/client';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { SourcesDataService } from './sources-data.service';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { GfhService } from './gfh.service';
import { SettingsService } from '@rumsan/settings';
import { DataSourceValue } from 'src/types/settings';

jest.mock('src/common', () => ({
  buildQueryParams: jest.fn().mockReturnValue({
    date_from: '2023-01-01',
    date_to: '2023-01-31',
  }),
  getFormattedDate: jest.fn().mockImplementation((date) => {
    if (date) {
      // If a date is passed, return a formatted date based on that date
      return {
        dateString: '2023-01-01',
        dateTimeString: '2023-01-01T00:00:00Z',
      };
    }
    return {
      dateString: '2023-01-01',
      dateTimeString: '2023-01-01T00:00:00Z',
    };
  }),
  parseGlofasData: jest.fn().mockReturnValue({}),
}));

jest.mock('@rumsan/settings', () => ({
  SettingsService: {
    get: jest.fn().mockReturnValue({
      DHM: [
        {
          WATER_LEVEL: {
            LOCATION: 'test-location',
            SERIESID: [4, 5, 6],
          },
          RAINFALL: {
            LOCATION: 'test-location',
            SERIESID: [1, 2, 3],
          },
        },
      ],
      GLOFAS: [
        {
          LOCATION: 'test-location',
          URL: 'http://test-url.com',
          BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
          I: '227',
          J: '67',
          TIMESTRING: '2023-10-01T00:00:00Z',
        },
      ],
      GFH: [
        {
          STATION_NAME: 'test-location',
          RIVER_NAME: 'test-river',
          STATION_ID: 'test-station-id',
        },
      ],
    }),
  },
}));

describe('ScheduleSourcesDataService', () => {
  let service: ScheduleSourcesDataService;
  let sourceService: SourcesDataService;
  let dhmService: DhmService;
  let glofasService: GlofasService;
  let gfhService: GfhService;
  let httpService: HttpService;

  const mockSourceService = {
    getWaterLevels: jest.fn(),
    getRainfallLevels: jest.fn(),
    create: jest.fn(),
    findGfhData: jest.fn(),
  };

  const mockDhmService = {
    getDhmRiverWatchData: jest.fn(),
    getDhmRainfallWatchData: jest.fn(),
    normalizeDhmRiverAndRainfallWatchData: jest.fn(),
    saveDataInDhm: jest.fn(),
  };

  const mockGlofasService = {
    getStationData: jest.fn().mockResolvedValue({
      returnPeriodTable: {
        returnPeriodData: [['2023-01-01-1']],
        returnPeriodHeaders: ['1'],
      },
      content: {
        'Reporting Points': {
          layer_name_index: 'Reporting Points',
          point: '<table>test data</table>',
          name: 'G10165; Basin: Nepal; Station: Na;',
        },
      },
    }),
    saveGlofasStationData: jest.fn(),
    findGlofasDataByDate: jest.fn().mockResolvedValue(null),
  };

  const mockGfhService = {
    fetchAllGauges: jest.fn(),
    processGaugeData: jest.fn(),
    saveDataInGfh: jest.fn(),
    matchStationToGauge: jest.fn().mockReturnValue([{}, []]),
    buildFinalOutput: jest.fn().mockReturnValue({}),
    formateGfhStationData: jest.fn().mockReturnValue({}),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    axiosRef: {
      get: jest.fn().mockImplementation((url) => {
        if (url.includes('rainfall')) {
          return Promise.resolve({
            data: {
              data: [
                [
                  {
                    series_id: 4,
                    name: 'Test Station',
                    location: 'test-location',
                  },
                  {
                    series_id: 5,
                    name: 'Test Station 2',
                    location: 'test-location',
                  },
                  {
                    series_id: 6,
                    name: 'Test Station 3',
                    location: 'test-location',
                  },
                ],
              ],
            },
          });
        } else {
          return Promise.resolve({
            data: {
              data: [
                {
                  series_id: 4,
                  name: 'Test Station',
                  location: 'test-location',
                },
                {
                  series_id: 5,
                  name: 'Test Station 2',
                  location: 'test-location',
                },
                {
                  series_id: 6,
                  name: 'Test Station 3',
                  location: 'test-location',
                },
              ],
            },
          });
        }
      }),
      post: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleSourcesDataService,
        {
          provide: SourcesDataService,
          useValue: mockSourceService,
        },
        {
          provide: DhmService,
          useValue: mockDhmService,
        },
        {
          provide: GlofasService,
          useValue: mockGlofasService,
        },
        {
          provide: GfhService,
          useValue: mockGfhService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<ScheduleSourcesDataService>(
      ScheduleSourcesDataService,
    );
    sourceService = module.get<SourcesDataService>(SourcesDataService);
    dhmService = module.get<DhmService>(DhmService);
    glofasService = module.get<GlofasService>(GlofasService);
    gfhService = module.get<GfhService>(GfhService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    beforeEach(() => {
      jest.spyOn(service, 'syncRiverWaterData').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncRainfallData').mockResolvedValue(undefined);
      jest.spyOn(service, 'synchronizeGlofas').mockResolvedValue(undefined);
      jest.spyOn(service, 'syncGlobalFloodHub').mockResolvedValue(undefined);
    });

    it('should call all sync methods on bootstrap', () => {
      service.onApplicationBootstrap();

      expect(service.syncRiverWaterData).toHaveBeenCalled();
      expect(service.syncRainfallData).toHaveBeenCalled();
      expect(service.synchronizeGlofas).toHaveBeenCalled();
      expect(service.syncGlobalFloodHub).toHaveBeenCalled();
    });
  });

  describe('syncRiverWaterData', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [
        {
          RAINFALL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29785, 29608, 5726, 29689],
          },
          WATER_LEVEL: {
            LOCATION: 'Doda river at East-West Highway',
            SERIESID: [29089],
          },
        },
      ],
      GLOFAS: [
        {
          LOCATION: 'Doda river at East-West Highway',
          URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
          I: '227',
          J: '67',
          TIMESTRING: '2023-10-01T00:00:00Z',
        },
      ],
      GFH: [
        {
          RIVER_BASIN: 'Doda river at East-West Highway',
          STATION_LOCATIONS_DETAILS: [
            {
              STATION_NAME: 'Doda River Basin',
              RIVER_GAUGE_ID: 'hybas_4120803470',
              RIVER_NAME: 'doda',
              STATION_ID: 'G10165',
              POINT_ID: 'SI002576',
              LISFLOOD_DRAINAGE_AREA: 432,
              'LISFLOOD_X_(DEG)': 80.422917,
              'LISFLOOD_Y_[DEG]': 28.84375,
              LATITUDE: 28.84375,
              LONGITUDE: 80.422917,
            },
            {
              STATION_NAME: 'Sarda River Basin',
              RIVER_NAME: 'doda',
              STATION_ID: 'G10165',
              POINT_ID: 'SI002576',
              LISFLOOD_DRAINAGE_AREA: 432,
              'LISFLOOD_X_(DEG)': 80.422917,
              'LISFLOOD_Y_[DEG]': 28.84375,
              LATITUDE: 28.84375,
              LONGITUDE: 80.422917,
            },
          ],
        },
      ],
    };

    const mockStationData = {
      id: 1,
      name: 'Test Station',
      location: 'test-location',
    };

    const mockRiverWatchData = [
      { date: '2023-01-01', value: 100 },
      { date: '2023-01-02', value: 150 },
    ];

    const mockNormalizedData = [
      { date: '2023-01-01', value: 100 },
      { date: '2023-01-02', value: 150 },
    ];

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      jest
        .spyOn(service as any, 'fetchRiverStation')
        .mockResolvedValue(mockStationData);
      mockDhmService.getDhmRiverWatchData.mockResolvedValue(mockRiverWatchData);
      mockDhmService.normalizeDhmRiverAndRainfallWatchData.mockResolvedValue(
        mockNormalizedData,
      );
      mockDhmService.saveDataInDhm.mockResolvedValue(true);
    });

    it('should sync river water data successfully', async () => {
      await service.syncRiverWaterData();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(service['fetchRiverStation']).toHaveBeenCalled();
      expect(mockDhmService.getDhmRiverWatchData).toHaveBeenCalled();
      expect(
        mockDhmService.normalizeDhmRiverAndRainfallWatchData,
      ).toHaveBeenCalled();
      expect(mockDhmService.saveDataInDhm).toHaveBeenCalled();
    });

    it('should handle missing station data', async () => {
      jest.spyOn(service as any, 'fetchRiverStation').mockResolvedValue(null);

      await service.syncRiverWaterData();

      expect(mockDhmService.getDhmRiverWatchData).not.toHaveBeenCalled();
    });

    it('should handle missing query params', async () => {
      // Mock buildQueryParams to return null
      const { buildQueryParams } = require('src/common');
      jest.mocked(buildQueryParams).mockReturnValue(null);

      await service.syncRiverWaterData();

      expect(mockDhmService.getDhmRiverWatchData).not.toHaveBeenCalled();
    });

    it('should handle save data failure', async () => {
      mockDhmService.saveDataInDhm.mockRejectedValue(
        new Error('Failed to save data'),
      );

      await service.syncRiverWaterData();

      expect(mockDhmService.saveDataInDhm).not.toHaveBeenCalled();
    });
  });

  describe('syncRainfallData', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [
        {
          RAINFALL: {
            LOCATION: 'test-location',
            SERIESID: [123, 456],
          },
          WATER_LEVEL: {
            LOCATION: '',
            SERIESID: [],
          },
        },
      ],
      GLOFAS: [],
      GFH: [],
    };

    const mockStationData = {
      id: 1,
      name: 'Test Station',
      location: 'test-location',
    };

    const mockRainfallData = [
      { date: '2023-01-01', value: 50 },
      { date: '2023-01-02', value: 75 },
    ];

    const mockNormalizedData = [
      { datetime: '2023-01-01', value: 50 },
      { datetime: '2023-01-02', value: 75 },
    ];

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      jest
        .spyOn(service as any, 'fetchRainfallStation')
        .mockResolvedValue(mockStationData);
      jest
        .spyOn(dhmService, 'getDhmRainfallWatchData')
        .mockResolvedValue(mockRainfallData);
      jest
        .spyOn(dhmService, 'normalizeDhmRiverAndRainfallWatchData')
        .mockResolvedValue(mockNormalizedData);
      jest.spyOn(dhmService, 'saveDataInDhm').mockResolvedValue({
        info: { message: 'Data saved successfully' },
        id: 1,
        type: SourceType.RAINFALL,
        sourceId: 1,
        dataSource: DataSource.DHM,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Reset buildQueryParams mock to return valid data
      const { buildQueryParams } = require('src/common');
      jest.mocked(buildQueryParams).mockReturnValue({
        date_from: '2023-01-01',
        date_to: '2023-01-31',
      });
    });

    it('should sync rainfall data successfully', async () => {
      await service.syncRainfallData();

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(service['fetchRainfallStation']).toHaveBeenCalled();
      expect(dhmService.getDhmRainfallWatchData).toHaveBeenCalled();
      expect(
        dhmService.normalizeDhmRiverAndRainfallWatchData,
      ).toHaveBeenCalled();
      expect(dhmService.saveDataInDhm).toHaveBeenCalled();
    });

    it('should handle missing station data', async () => {
      jest
        .spyOn(service as any, 'fetchRainfallStation')
        .mockResolvedValue(null);

      await service.syncRainfallData();

      expect(dhmService.getDhmRainfallWatchData).not.toHaveBeenCalled();
    });

    it('should handle missing query params', async () => {
      // Mock buildQueryParams to return null
      const { buildQueryParams } = require('src/common');
      jest.mocked(buildQueryParams).mockReturnValue(null);

      await service.syncRainfallData();

      expect(dhmService.getDhmRainfallWatchData).not.toHaveBeenCalled();
    });
  });

  describe('synchronizeGlofas', () => {
    const mockDataSource: DataSourceValue = {
      GLOFAS: [
        {
          LOCATION: 'Doda river at East-West Highway',
          URL: 'https://ows.globalfloods.eu/glofas-ows/ows.py',
          BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
          I: '227',
          J: '67',
          TIMESTRING: '2023-10-01T00:00:00Z',
        },
      ],
      DHM: [],
      GFH: [],
    };

    const mockStationData = {
      returnPeriodTable: {
        returnPeriodData: [['2023-01-01-1']],
        returnPeriodHeaders: ['1'],
      },
      content: {
        'Reporting Points': {
          layer_name_index: 'Reporting Points',
          point:
            '<table class="tbl_info_point" summary="Point Information">\n' +
            '<tr>\n' +
            '<th class="cell_header">Station ID</th>\n' +
            '<th>Country</th>\n' +
            '<th>Basin</th>\n' +
            '<th>River</th>\n' +
            '<th>Station Name</th>\n' +
            '<th>Point ID</th>\n' +
            '<th>Drainage Area [km2]</th>\n' +
            '<th>Longitude [Deg]</th>\n' +
            '<th>Latitude [Deg]</th>\n' +
            '<th>LISFLOOD Drainage Area [km2]</th>\n' +
            '<th>LISFLOOD X [Deg]</th>\n' +
            '<th>LISFLOOD Y [Deg]</th>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>G10165</td>\n' +
            '<td>Nepal</td>\n' +
            '<td>Na</td>\n' +
            '<td>Doda</td>\n' +
            '<td>Doda river at East-West Highway</td>\n' +
            '<td>SI002098</td>\n' +
            '<td>NA</td>\n' +
            '<td>80.434</td>\n' +
            '<td>28.853</td>\n' +
            '<td>432</td>\n' +
            '<td>80.425</td>\n' +
            '<td>28.875</td>\n' +
            '</tr>\n' +
            '</table><table class="tbl_info_point" summary="Point Forecast">\n' +
            '<caption>Point Forecast</caption>\n' +
            '<tr>\n' +
            '<th class="cell_header">Forecast Date</th>\n' +
            '<th>Maximum probability (2 yr / 5 yr / 20 yr)</th>\n' +
            '<th>Alert level</th>\n' +
            '<th>Max probability step (earliest)</th>\n' +
            '<th>Discharge tendency</th>\n' +
            '<th>Peak forecasted</th>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td>2025-08-05</td>\n' +
            '<td>3 / 1 / 0</td>\n' +
            '<td>Inactive</td>\n' +
            '<td>No Data</td>\n' +
            '<td><img class="img-responsive" src="https://global-flood.emergency.copernicus.eu/static/images/viewer/RisingArrow.gif" alt="Discharge tendency"></td>\n' +
            '<td>in 10-13 days (on 2025-08-15)</td>\n' +
            '</tr>\n' +
            `</table><br><a href="#" class="open_close" onclick="$('.forecast_images').toggle('1000');return false;">&gt;&gt;Open/Close GloFAS Forecast images</a><br><br><br><div class="forecast_images">\n` +
            '<span class="title">Discharge Hydrograph (ECMWF-ENS)</span><img class="img-responsive" src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202508/2025080500/SI002098_Dis_EGE2025080500.svg" alt="Discharge Hydrograph (ECMWF-ENS)" width="800" height="380"><br><span class="title">Upstream Precipitation (ECMWF-ENS)</span><img class="img-responsive" src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202508/2025080500/SI002098_Rups_EGE2025080500.svg" alt="Upstream Precipitation (ECMWF-ENS)" width="800" height="320"><br><span class="title">Upstream Snowmelt (ECMWF-ENS)</span><img class="img-responsive" src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202508/2025080500/SI002098_Smups_EGE2025080500.svg" alt="Upstream Snowmelt (ECMWF-ENS)" width="800" height="320"><br><span class="title">Average Temperature (ECMWF-ENS)</span><img class="img-responsive" src="https://ows.globalfloods.eu/glofas-ows/?&amp;act=getFile&amp;f=/global/2025/202508/2025080500/SI002098_Ta_EGE2025080500.svg" alt="Average Temperature (ECMWF-ENS)" width="800" height="320"><br>\n' +
            '</div><table class="table-forecast-result table-forecast-result-global" summary="Forecasts Overview (2025-08-05 00:00)">\n' +
            '<caption>Forecasts Overview (2025-08-05 00:00)</caption>\n' +
            '<colgroup></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<colgroup class="overview"></colgroup>\n' +
            '<thead><tr>\n' +
            '<th class="cell_header">Forecast Type</th>\n' +
            '<th>05</th>\n' +
            '<th>06</th>\n' +
            '<th>07</th>\n' +
            '<th>08</th>\n' +
            '<th>09</th>\n' +
            '<th>10</th>\n' +
            '<th>11</th>\n' +
            '<th>12</th>\n' +
            '<th>13</th>\n' +
            '<th>14</th>\n' +
            '<th>15</th>\n' +
            '<th>16</th>\n' +
            '<th>17</th>\n' +
            '<th>18</th>\n' +
            '<th>19</th>\n' +
            '</tr></thead>\n' +
            '<tbody><tr>\n' +
            '<td class="cell_header">ECMWF-ENS</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '</tr></tbody>\n' +
            '</table><table class="table-forecast-result table-forecast-result-global" summary="ECMWF-ENS &gt; 2 yr RP">\n' +
            '<caption>ECMWF-ENS &gt; 2 yr RP</caption>\n' +
            '<colgroup></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<colgroup class="egeGtMal"></colgroup>\n' +
            '<thead><tr>\n' +
            '<th class="cell_header">Forecast Day</th>\n' +
            '<th>30</th>\n' +
            '<th>31</th>\n' +
            '<th>1</th>\n' +
            '<th>2</th>\n' +
            '<th>3</th>\n' +
            '<th>4</th>\n' +
            '<th>5</th>\n' +
            '<th>6</th>\n' +
            '<th>7</th>\n' +
            '<th>8</th>\n' +
            '<th>9</th>\n' +
            '<th>10</th>\n' +
            '<th>11</th>\n' +
            '<th>12</th>\n' +
            '<th>13</th>\n' +
            '<th>14</th>\n' +
            '<th>15</th>\n' +
            '<th>16</th>\n' +
            '<th>17</th>\n' +
            '<th>18</th>\n' +
            '<th>19</th>\n' +
            '</tr></thead>\n' +
            '<tbody>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-08-05</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-08-04</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-08-03</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-08-02</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-08-01</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="FFFFFF">10</td>\n' +
            '<td class="FFFFFF">10</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-07-31</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">4</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">6</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="FFFFFF">10</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '<tr>\n' +
            '<td class="cell_header">2025-07-30</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF"></td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">2</td>\n' +
            '<td class="FFFFFF">8</td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '<td class="666666"></td>\n' +
            '</tr>\n' +
            '</tbody>\n' +
            '</table><table class="table-forecast-result table-forecast-result-global" summary="ECMWF-ENS &gt; 5 yr RP">\n' +
            '<caption>ECMWF-ENS &gt; 5 yr RP</caption>\n' +
            '<colgroup></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgroup>\n' +
            '<colgroup class="egeGtHal"></colgrou',
          name: 'G10165; Basin: Nepal; Station: Na;',
        },
      },
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockGlofasService.saveGlofasStationData.mockResolvedValue(true);
    });

    it('should synchronize Glofas data successfully', async () => {
      expect(service.synchronizeGlofas).toBeDefined();
      expect(typeof service.synchronizeGlofas).toBe('function');

      jest.spyOn(glofasService, 'findGlofasDataByDate').mockResolvedValue(null);
      jest.spyOn(glofasService, 'getStationData').mockResolvedValue({
        returnPeriodTable: {
          returnPeriodData: [['2023-01-01-1']],
          returnPeriodHeaders: ['1'],
        },
        content: {
          'Reporting Points': {
            layer_name_index: 'Reporting Points',
            point: '<table>test data</table>',
            name: 'G10165; Basin: Nepal; Station: Na;',
          },
        },
      });

      const { parseGlofasData } = require('src/common');
      jest.mocked(parseGlofasData).mockReturnValue({
        someData: 'test',
        forecastData: 'test',
      });

      jest.spyOn(sourceService, 'create').mockResolvedValue({
        info: {
          message: 'Data saved successfully',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        type: SourceType.RAINFALL,
        id: 1,
        sourceId: 1,
        source: {
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          source: [],
          uuid: 'test-uuid',
          riverBasin: 'test-location',
        },
        dataSource: DataSource.GLOFAS,
      });

      await expect(service.synchronizeGlofas()).resolves.not.toThrow();
    });
  });

  describe('fetchRiverStation', () => {
    const mockStationData = {
      id: 1,
      name: 'River Station',
      location: 'test-location',
    };

    beforeEach(() => {
      mockHttpService.get.mockReturnValue({
        toPromise: () => Promise.resolve({ data: mockStationData }),
      });
    });

    it('should fetch river station successfully', async () => {
      const result = await service['fetchRiverStation'](4);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalled();
      expect(result).toEqual({
        series_id: 4,
        name: 'Test Station',
        location: 'test-location',
      });
    });

    it('should return null when fetch fails', async () => {
      mockHttpService.axiosRef.get.mockRejectedValue(new Error('Fetch failed'));

      const result = await service['fetchRiverStation'](4);

      expect(result).toBeNull();
    });
  });

  describe('syncGlobalFloodHub', () => {
    const mockDataSource: DataSourceValue = {
      DHM: [],
      GLOFAS: [],
      GFH: [
        {
          RIVER_BASIN: 'Test River Basin',
          STATION_LOCATIONS_DETAILS: [
            {
              STATION_NAME: 'Test Station',
              RIVER_GAUGE_ID: 'test-gauge-id',
              RIVER_NAME: 'test-river',
              STATION_ID: 'test-station-id',
              POINT_ID: 'test-point-id',
              LISFLOOD_DRAINAGE_AREA: 100,
              'LISFLOOD_X_(DEG)': 80.123,
              'LISFLOOD_Y_[DEG]': 28.456,
              LATITUDE: 28.456,
              LONGITUDE: 80.123,
            },
          ],
        },
      ],
    };

    const mockGauges = [
      {
        gauge_id: 'test-gauge-id',
        latitude: 28.456,
        longitude: 80.123,
      },
    ];

    const mockStationGaugeMapping = new Map([
      ['test-station-id', { distance_km: 0.5, gauge_id: 'test-gauge-id' }],
    ]);

    const mockGaugeDataCache = {
      'test-gauge-id': {
        latest_forecast: {
          forecastRanges: [
            {
              start: '2025-08-18',
              end: '2025-08-19',
              forecast: {
                probability: { rp2: 0.3, rp20: 0, rp5: 0.1 },
                quality_verified: true,
                severity: 'WARNING',
                trend: 'RISING',
              },
            },
          ],
        },
        model_metadata: {
          model_run_date: '2025-08-18T00:00:00Z',
          model_version: '1.0',
        },
      },
    };

    const mockFormattedData = {
      riverBasin: 'Doda river at East-West Highway',
      forecastDate: '2025-08-18',
      source: 'HYBAS',
      latitude: '28.843750',
      longitude: '80.422917',
      stationName: 'Sarda River Basin',
      warningLevel: '47.362',
      dangerLevel: '66.398',
      extremeDangerLevel: '93.634',
      basinSize: 0,
      riverGaugeId: 'hybas_4120803470',
      history: [
        { value: '19.5', datetime: '2025-08-16T00:00:00Z' },
        { value: '19.3', datetime: '2025-08-17T00:00:00Z' },
        { value: '18.6', datetime: '2025-08-18T00:00:00Z' },
        { value: '18.4', datetime: '2025-08-19T00:00:00Z' },
        { value: '19.9', datetime: '2025-08-20T00:00:00Z' },
        { value: '19.2', datetime: '2025-08-21T00:00:00Z' },
        { value: '21.6', datetime: '2025-08-22T00:00:00Z' },
        { value: '25.7', datetime: '2025-08-23T00:00:00Z' },
      ],
    };

    beforeEach(() => {
      jest.spyOn(SettingsService, 'get').mockReturnValue(mockDataSource);
      mockGfhService.fetchAllGauges.mockResolvedValue(mockGauges);
      const stationGaugeMapping = new Map().set('test-station-id', {
        gauge_id: 'test-gauge-id',
        distance_km: 0.5,
      });
      mockGfhService.matchStationToGauge.mockReturnValue([
        stationGaugeMapping,
        new Set(['test-gauge-id']),
      ]);
      mockGfhService.processGaugeData.mockResolvedValue(mockGaugeDataCache);
      mockGfhService.buildFinalOutput.mockReturnValue({
        'test-station-id': {
          gaugeId: 'test-gauge-id',
          distance_km: 0.5,
          source: 'test-source',
          gaugeLocation: {
            latitude: 28.456,
            longitude: 80.123,
          },
          qualityVerified: true,
          model_metadata: mockGaugeDataCache['test-gauge-id'].model_metadata,
          issuedTime: '2025-08-18T00:00:00Z',
          forecastTimeRange: { start: '2025-08-18', end: '2025-08-19' },
          forecastTrend: 'RISING',
          severity: 'WARNING',
          forecasts:
            mockGaugeDataCache['test-gauge-id'].latest_forecast.forecastRanges,
        },
      });
      mockGfhService.formateGfhStationData.mockReturnValue(mockFormattedData);
      mockGfhService.saveDataInGfh.mockResolvedValue({
        id: 1,
        type: SourceType.WATER_LEVEL,
        dataSource: DataSource.GFH,
        info: mockFormattedData,
        sourceId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSourceService.findGfhData.mockResolvedValue([]);
    });

    it('should sync global flood hub data successfully', async () => {
      await service.syncGlobalFloodHub();
      await new Promise(process.nextTick);

      expect(SettingsService.get).toHaveBeenCalledWith('DATASOURCE');
      expect(mockGfhService.fetchAllGauges).toHaveBeenCalled();
      expect(mockSourceService.findGfhData).toHaveBeenCalledWith(
        'Test River Basin',
        '2023-01-01',
        'Test Station',
      );
      expect(mockGfhService.matchStationToGauge).toHaveBeenCalledWith(
        mockGauges,
        mockDataSource.GFH[0].STATION_LOCATIONS_DETAILS[0],
      );
      expect(mockGfhService.processGaugeData).toHaveBeenCalledWith(
        new Set(['test-gauge-id']),
      );
      expect(mockGfhService.buildFinalOutput).toHaveBeenCalledWith(
        mockStationGaugeMapping,
        mockGaugeDataCache,
      );
      expect(mockGfhService.formateGfhStationData).toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).toHaveBeenCalledWith(
        SourceType.WATER_LEVEL,
        'Test River Basin',
        mockFormattedData,
      );
    });

    it('should skip if GFH settings are empty', async () => {
      jest.spyOn(SettingsService, 'get').mockReturnValue({
        DHM: [],
        GLOFAS: [],
        GFH: [],
      });

      await service.syncGlobalFloodHub();

      expect(mockGfhService.fetchAllGauges).not.toHaveBeenCalled();
      expect(mockGfhService.processGaugeData).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should skip if data already exists for the date', async () => {
      mockSourceService.findGfhData.mockResolvedValue([
        { id: 1, info: mockFormattedData },
      ]);

      await service.syncGlobalFloodHub();

      expect(mockGfhService.matchStationToGauge).not.toHaveBeenCalled();
      expect(mockGfhService.processGaugeData).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should throw error if no gauges found', async () => {
      mockGfhService.fetchAllGauges.mockResolvedValue([]);

      await expect(service.syncGlobalFloodHub()).rejects.toThrow(
        'No gauges found',
      );
      expect(mockGfhService.processGaugeData).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should skip when no station data found in output', async () => {
      mockGfhService.buildFinalOutput.mockReturnValue({});

      await service.syncGlobalFloodHub();

      expect(mockGfhService.formateGfhStationData).not.toHaveBeenCalled();
      expect(mockGfhService.saveDataInGfh).not.toHaveBeenCalled();
    });

    it('should handle multiple station locations', async () => {
      const multiStationDataSource = {
        ...mockDataSource,
        GFH: [
          {
            RIVER_BASIN: 'Test River Basin',
            STATION_LOCATIONS_DETAILS: [
              mockDataSource.GFH[0].STATION_LOCATIONS_DETAILS[0],
              {
                STATION_NAME: 'Test Station 2',
                RIVER_GAUGE_ID: 'test-gauge-id-2',
                RIVER_NAME: 'test-river-2',
                STATION_ID: 'test-station-id-2',
                POINT_ID: 'test-point-id-2',
                LISFLOOD_DRAINAGE_AREA: 200,
                'LISFLOOD_X_(DEG)': 81.123,
                'LISFLOOD_Y_[DEG]': 29.456,
                LATITUDE: 29.456,
                LONGITUDE: 81.123,
              },
            ],
          },
        ],
      };

      jest
        .spyOn(SettingsService, 'get')
        .mockReturnValue(multiStationDataSource);

      await service.syncGlobalFloodHub();

      expect(mockSourceService.findGfhData).toHaveBeenCalledTimes(2);
      expect(mockGfhService.matchStationToGauge).toHaveBeenCalledTimes(2);
    });
  });
});
