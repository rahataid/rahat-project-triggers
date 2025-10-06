import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { GlofasStationProcessorService } from './glofas-station-processor.service';
import { GlofasService } from '../glofas.service';
import { SourcesDataService } from '../sources-data.service';
import { GlofasStationInfo } from '../dto';
import { HealthError } from './health-utils.service';

// Mock the common functions
jest.mock('src/common', () => ({
  getFormattedDate: jest.fn(),
  parseGlofasData: jest.fn(),
}));

describe('GlofasStationProcessorService', () => {
  let service: GlofasStationProcessorService;
  let glofasService: GlofasService;
  let sourceService: SourcesDataService;
  let getFormattedDateMock: jest.Mock;
  let parseGlofasDataMock: jest.Mock;

  const mockGlofasService = {
    findGlofasDataByDate: jest.fn(),
    getStationData: jest.fn(),
  };

  const mockSourceService = {
    create: jest.fn(),
  };

  const mockGlofasStation: GlofasStationInfo = {
    LOCATION: 'Test River Basin',
    URL: 'https://test-glofas-url.com',
    BBOX: '8918060.964088082,3282511.7426786087,9006116.420672605,3370567.1992631317',
    I: '227',
    J: '67',
    TIMESTRING: '2023-10-01T00:00:00Z',
  };

  const mockStationData = {
    returnPeriodTable: {
      returnPeriodData: [['2023-01-01-1']],
      returnPeriodHeaders: ['1'],
    },
    content: {
      'Reporting Points': {
        layer_name_index: 'Reporting Points',
        point: '<table>test reporting points data</table>',
        name: 'G10165; Basin: Nepal; Station: Na;',
      },
    },
  };

  const mockParsedGlofasData = {
    stationId: 'G10165',
    basin: 'Nepal',
    station: 'Na',
    forecastData: 'test forecast data',
  };

  beforeEach(async () => {
    // Import and mock functions
    getFormattedDateMock = require('src/common').getFormattedDate;
    parseGlofasDataMock = require('src/common').parseGlofasData;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlofasStationProcessorService,
        {
          provide: GlofasService,
          useValue: mockGlofasService,
        },
        {
          provide: SourcesDataService,
          useValue: mockSourceService,
        },
      ],
    }).compile();

    service = module.get<GlofasStationProcessorService>(GlofasStationProcessorService);
    glofasService = module.get<GlofasService>(GlofasService);
    sourceService = module.get<SourcesDataService>(SourcesDataService);

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Mock Date methods
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-02T10:05:00.000Z');
    jest.spyOn(Date.prototype, 'getDate').mockReturnValue(2);
    jest.spyOn(Date.prototype, 'setDate').mockImplementation();

    // Default mock implementations
    getFormattedDateMock.mockReturnValue({
      dateString: '2023-01-01',
      dateTimeString: '2023-01-01T00:00:00Z',
    });
    parseGlofasDataMock.mockReturnValue(mockParsedGlofasData);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processGlofasStation', () => {
    let errors: HealthError[];

    beforeEach(() => {
      errors = [];
    });

    it('should process Glofas station successfully', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockSourceService.create.mockResolvedValue({
        id: 1,
        source: 'GLOFAS',
        riverBasin: 'Test River Basin',
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);
      
      // Verify date calculation
      expect(getFormattedDateMock).toHaveBeenCalledWith(expect.any(Date));
      
      // Verify data existence check
      expect(mockGlofasService.findGlofasDataByDate).toHaveBeenCalledWith(
        'Test River Basin',
        '2023-01-01',
      );
      
      // Verify station data fetch
      expect(mockGlofasService.getStationData).toHaveBeenCalledWith({
        ...mockGlofasStation,
        TIMESTRING: '2023-01-01T00:00:00Z',
      });
      
      // Verify data parsing
      expect(parseGlofasDataMock).toHaveBeenCalledWith('<table>test reporting points data</table>');
      
      // Verify data save
      expect(mockSourceService.create).toHaveBeenCalledWith({
        source: 'GLOFAS',
        riverBasin: 'Test River Basin',
        type: SourceType.RAINFALL,
        info: {
          ...mockParsedGlofasData,
          forecastDate: '2023-01-01',
        },
      });
      
      expect(Logger.prototype.log).toHaveBeenCalledWith('GLOFAS: Fetching data for Test River Basin on 2023-01-01');
      expect(Logger.prototype.log).toHaveBeenCalledWith('GLOFAS: Parsed data for Test River Basin on 2023-01-01');
      expect(Logger.prototype.log).toHaveBeenCalledWith('GLOFAS: Data saved successfully for Test River Basin on 2023-01-01');
    });

    it('should return true if data already exists', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue({
        id: 1,
        riverBasin: 'Test River Basin',
        forecastDate: '2023-01-01',
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(true);
      expect(errors).toHaveLength(0);
      expect(mockGlofasService.getStationData).not.toHaveBeenCalled();
      expect(mockSourceService.create).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'GLOFAS: Data for Test River Basin on 2023-01-01 already exists.',
      );
    });

    it('should handle missing station data', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(null);

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_NO_DATA',
        message: 'No reporting points data found for Test River Basin',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
      expect(mockSourceService.create).not.toHaveBeenCalled();
    });

    it('should handle missing content in station data', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue({
        returnPeriodTable: {},
        content: {},
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_NO_DATA',
        message: 'No reporting points data found for Test River Basin',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
    });

    it('should handle missing Reporting Points in content', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue({
        returnPeriodTable: {},
        content: {
          'Other Data': {
            point: 'some data',
          },
        },
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GLOFAS_NO_DATA');
    });

    it('should handle missing point in Reporting Points', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue({
        returnPeriodTable: {},
        content: {
          'Reporting Points': {
            layer_name_index: 'Reporting Points',
            name: 'Some name',
            // Missing point property
          },
        },
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GLOFAS_NO_DATA');
    });

    it('should handle save failure', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockSourceService.create.mockResolvedValue(null);

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_SAVE_ERROR',
        message: 'Failed to save data for Test River Basin on 2023-01-01',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'GLOFAS: Failed to save data for Test River Basin on 2023-01-01',
      );
    });

    it('should handle save returning false', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockSourceService.create.mockResolvedValue(false);

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('GLOFAS_SAVE_ERROR');
    });

    it('should handle errors during data existence check', async () => {
      mockGlofasService.findGlofasDataByDate.mockRejectedValue(new Error('Database error'));

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_STATION_ERROR',
        message: 'Error processing station Test River Basin: Database error',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'GLOFAS: Error processing station Test River Basin:',
        'Database error',
      );
    });

    it('should handle errors during station data fetch', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockRejectedValue(new Error('API error'));

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_STATION_ERROR',
        message: 'Error processing station Test River Basin: API error',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
    });

    it('should handle errors during data parsing', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      parseGlofasDataMock.mockImplementation(() => {
        throw new Error('Parsing error');
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_STATION_ERROR',
        message: 'Error processing station Test River Basin: Parsing error',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
    });

    it('should handle errors during data save', async () => {
      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockSourceService.create.mockRejectedValue(new Error('Save error'));

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_STATION_ERROR',
        message: 'Error processing station Test River Basin: Save error',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
    });

    it('should handle error without message property', async () => {
      mockGlofasService.findGlofasDataByDate.mockRejectedValue({
        code: 'SOME_ERROR_CODE',
        status: 500,
      });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: 'GLOFAS_STATION_ERROR',
        message: 'Error processing station Test River Basin: Unknown error',
        timestamp: '2023-01-02T10:05:00.000Z',
      });
    });

    it('should handle different date formats', async () => {
      getFormattedDateMock.mockReturnValue({
        dateString: '2023-12-25',
        dateTimeString: '2023-12-25T12:30:00Z',
      });

      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(mockStationData);
      mockSourceService.create.mockResolvedValue({ id: 1 });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(true);
      expect(mockGlofasService.findGlofasDataByDate).toHaveBeenCalledWith(
        'Test River Basin',
        '2023-12-25',
      );
      expect(mockGlofasService.getStationData).toHaveBeenCalledWith({
        ...mockGlofasStation,
        TIMESTRING: '2023-12-25T12:30:00Z',
      });
      expect(mockSourceService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          info: expect.objectContaining({
            forecastDate: '2023-12-25',
          }),
        }),
      );
    });

    it('should handle complex station data structure', async () => {
      const complexStationData = {
        returnPeriodTable: {
          returnPeriodData: [['2023-01-01-1', '2023-01-01-2']],
          returnPeriodHeaders: ['1', '2'],
        },
        content: {
          'Reporting Points': {
            layer_name_index: 'Reporting Points',
            point: '<table><tr><td>Complex</td><td>Data</td></tr></table>',
            name: 'Complex Station Name',
          },
          'Other Data': {
            someProperty: 'someValue',
          },
        },
      };

      const complexParsedData = {
        stationId: 'COMPLEX123',
        basin: 'Complex Basin',
        station: 'Complex Station',
        additionalData: 'complex data',
      };

      mockGlofasService.findGlofasDataByDate.mockResolvedValue(null);
      mockGlofasService.getStationData.mockResolvedValue(complexStationData);
      parseGlofasDataMock.mockReturnValue(complexParsedData);
      mockSourceService.create.mockResolvedValue({ id: 2 });

      const result = await service.processGlofasStation(mockGlofasStation, errors);

      expect(result).toBe(true);
      expect(parseGlofasDataMock).toHaveBeenCalledWith('<table><tr><td>Complex</td><td>Data</td></tr></table>');
      expect(mockSourceService.create).toHaveBeenCalledWith({
        source: 'GLOFAS',
        riverBasin: 'Test River Basin',
        type: SourceType.RAINFALL,
        info: {
          ...complexParsedData,
          forecastDate: '2023-01-01',
        },
      });
    });
  });

  describe('createGlofasTasks', () => {
    it('should return the same array of Glofas settings', () => {
      const glofasSettings: GlofasStationInfo[] = [
        mockGlofasStation,
        {
          LOCATION: 'Another River Basin',
          URL: 'https://another-glofas-url.com',
          BBOX: 'different,bbox,coordinates,here',
          I: '100',
          J: '200',
          TIMESTRING: '2023-11-01T00:00:00Z',
        },
      ];

      const result = service.createGlofasTasks(glofasSettings);

      expect(result).toEqual(glofasSettings);
      expect(result).toBe(glofasSettings); // Should return the exact same reference
    });

    it('should handle empty array', () => {
      const result = service.createGlofasTasks([]);
      expect(result).toEqual([]);
    });

    it('should handle single station', () => {
      const singleStation = [mockGlofasStation];
      const result = service.createGlofasTasks(singleStation);
      expect(result).toEqual(singleStation);
    });

    it('should preserve all station properties', () => {
      const stationWithAllProps: GlofasStationInfo = {
        LOCATION: 'Complete Station',
        URL: 'https://complete-url.com',
        BBOX: '1,2,3,4',
        I: '999',
        J: '888',
        TIMESTRING: '2023-01-01T12:00:00Z',
      };

      const result = service.createGlofasTasks([stationWithAllProps]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(stationWithAllProps);
      expect(result[0].LOCATION).toBe('Complete Station');
      expect(result[0].URL).toBe('https://complete-url.com');
      expect(result[0].BBOX).toBe('1,2,3,4');
      expect(result[0].I).toBe('999');
      expect(result[0].J).toBe('888');
      expect(result[0].TIMESTRING).toBe('2023-01-01T12:00:00Z');
    });
  });
});
