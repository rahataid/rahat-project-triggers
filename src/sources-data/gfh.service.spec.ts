import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { SourceType } from '@prisma/client';
import { PrismaService } from '@rumsan/prisma';
import { GfhService } from './gfh.service';

describe('GfhService', () => {
  let service: GfhService;
  let prismaService: PrismaService;
  let httpService: HttpService;

  const mockPrismaService = {
    source: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    sourcesData: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    process.env.FLOODS_API_KEY = 'mocked_value';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GfhService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<GfhService>(GfhService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    // mock api key in environment
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.FLOODS_API_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAllGauges', () => {
    const mockGauges = [
      { id: 'gauge-1', name: 'Gauge 1' },
      { id: 'gauge-2', name: 'Gauge 2' },
    ];

    const mockResponse = {
      gauges: mockGauges,
      nextPageToken: null,
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse);
    });

    it('should fetch all gauges successfully', async () => {
      const result = await service.fetchAllGauges();

      expect(service['makeRequest']).toHaveBeenCalledWith(
        'gauges:searchGaugesByArea',
        'POST',
        undefined,
        {
          regionCode: 'NP',
          pageSize: 1000,
          includeNonQualityVerified: true,
        },
      );

      expect(result).toEqual(mockGauges);
    });

    it('should handle pagination correctly', async () => {
      const firstResponse = {
        gauges: mockGauges,
        nextPageToken: 'next-page',
      };
      const secondResponse = {
        gauges: [{ id: 'gauge-3', name: 'Gauge 3' }],
        nextPageToken: null,
      };

      jest
        .spyOn(service as any, 'makeRequest')
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const result = await service.fetchAllGauges();

      expect(service['makeRequest']).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3);
    });

    it('should handle null response', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(null);

      const result = await service.fetchAllGauges();

      expect(result).toEqual([]);
    });
  });

  describe('makeRequest', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should make GET request successfully', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service['makeRequest']('test-endpoint', 'GET');

      expect(global.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request successfully', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service['makeRequest'](
        'test-endpoint',
        'POST',
        undefined,
        { test: 'data' },
      );

      expect(global.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should handle request errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Request failed'),
      );

      const result = await service['makeRequest']('test-endpoint', 'GET');

      expect(result).toBeNull();
    });
  });

  describe('matchStationToGauge', () => {
    const mockGauges = [
      { id: 'gauge-1', location: { latitude: 27.7172, longitude: 85.324 } },
      { id: 'gauge-2', location: { latitude: 27.7173, longitude: 85.3241 } },
    ] as any;

    const mockStation = {
      STATION_ID: 'station-1',
      'LISFLOOD_X_(DEG)': 85.324,
      'LISFLOOD_Y_[DEG]': 27.7172,
    };

    it('should match station to gauge successfully', () => {
      const [mapping, uniqueGaugeIds] = service.matchStationToGauge(
        mockGauges,
        mockStation as any,
      );

      expect(mapping).toBeDefined();
      expect(uniqueGaugeIds).toBeInstanceOf(Set);
    });

    it('should handle empty gauges array', () => {
      const [mapping, uniqueGaugeIds] = service.matchStationToGauge(
        [],
        mockStation as any,
      );

      expect(mapping).toEqual({ 'station-1': null });
      expect(uniqueGaugeIds.size).toBe(0);
    });

    it('should handle station with no matching gauges', () => {
      const mockStationWithNoMatch = {
        STATION_ID: 'station-2',
        'LISFLOOD_X_(DEG)': 0,
        'LISFLOOD_Y_[DEG]': 0, // Far from any gauge
      };

      const [mapping, uniqueGaugeIds] = service.matchStationToGauge(
        mockGauges,
        mockStationWithNoMatch as any,
      );

      expect(mapping).toBeDefined();
      expect(uniqueGaugeIds.size).toBe(0);
    });
  });

  describe('filterValidGauges', () => {
    it('should filter valid gauges', () => {
      const mockGauges = [
        { id: 'gauge-1', location: { latitude: 27.7172, longitude: 85.324 } },
        { id: 'gauge-2', location: null },
        { id: 'gauge-3', location: { latitude: 27.7173, longitude: 85.3241 } },
      ] as any;

      const result = service['filterValidGauges'](mockGauges);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('gauge-1');
      expect(result[1].id).toBe('gauge-3');
    });
  });

  describe('createPoint', () => {
    it('should create point correctly', () => {
      const result = service['createPoint'](27.7172, 85.324);

      expect(result).toEqual({ x: 27.7172, y: 85.324 });
    });
  });

  describe('haversineKm', () => {
    it('should calculate distance correctly', () => {
      const pt1 = { x: 27.7172, y: 85.324 };
      const pt2 = { x: 27.7173, y: 85.3241 };

      const result = service['haversineKm'](pt1, pt2);

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should return 0 for same points', () => {
      const pt1 = { x: 27.7172, y: 85.324 };
      const pt2 = { x: 27.7172, y: 85.324 };

      const result = service['haversineKm'](pt1, pt2);

      expect(result).toBe(0);
    });
  });

  describe('toRadians', () => {
    it('should convert degrees to radians correctly', () => {
      const result = service['toRadians'](180);

      expect(result).toBe(Math.PI);
    });
  });

  describe('processGaugeData', () => {
    const mockUniqueGaugeIds = new Set(['gauge-1', 'gauge-2']);

    beforeEach(() => {
      jest
        .spyOn(service as any, 'fetchGaugeMetadata')
        .mockResolvedValue({ metadata: 'test' });
      jest
        .spyOn(service as any, 'fetchGaugeForecasts')
        .mockResolvedValue([{ forecast: 'test' }]);
    });

    it('should process gauge data successfully', async () => {
      const result = await service.processGaugeData(mockUniqueGaugeIds);

      expect(service['fetchGaugeMetadata']).toHaveBeenCalledTimes(2);
      expect(service['fetchGaugeForecasts']).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });

  describe('fetchGaugeMetadata', () => {
    it('should fetch gauge metadata successfully', async () => {
      const mockResponse = { gaugeModels: [{ metadata: 'test' }] };
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await service.fetchGaugeMetadata('gauge-1');

      expect(service['makeRequest']).toHaveBeenCalledWith(
        'gaugeModels:batchGet',
        'GET',
        { names: 'gaugeModels/gauge-1' },
      );
      expect(result).toEqual({ metadata: 'test' });
    });

    it('should handle empty response', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(null);

      const result = await service.fetchGaugeMetadata('gauge-1');

      expect(result).toEqual({});
    });
  });

  describe('fetchGaugeForecasts', () => {
    it('should fetch gauge forecasts successfully', async () => {
      const mockResponse = {
        forecasts: {
          'gauge-1': {
            forecasts: [{ forecast: 'test' }],
          },
        },
      };
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse);

      const result = await service.fetchGaugeForecasts('gauge-1', 7);

      expect(service['makeRequest']).toHaveBeenCalledWith(
        'gauges:queryGaugeForecasts',
        'GET',
        expect.objectContaining({
          gaugeIds: ['gauge-1'],
          issuedTimeStart: expect.any(String),
          issuedTimeEnd: expect.any(String),
        }),
      );
      expect(result).toEqual([{ forecast: 'test' }]);
    });

    it('should handle empty response', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(null);

      const result = await service.fetchGaugeForecasts('gauge-1', 7);

      expect(result).toEqual([]);
    });
  });

  describe('buildFinalOutput', () => {
    const mockStationGaugeMapping = {
      'station-1': { id: 'gauge-1', info: 'test' },
    } as any;

    const mockGaugeDataCache = {
      'gauge-1': { metadata: 'test', forecasts: [] },
    } as any;

    it('should build final output successfully', () => {
      const result = service.buildFinalOutput(
        mockStationGaugeMapping,
        mockGaugeDataCache,
      );

      expect(result).toBeDefined();
      expect(result['station-1']).toBeDefined();
    });
  });

  describe('formateGfhStationData', () => {
    it('should format GFH station data correctly', () => {
      const dateString = '2023-01-01';
      const stationData = {
        gaugeId: 'test-gauge',
        gaugeLocation: { latitude: 27.7172, longitude: 85.324 },
        model_metadata: {
          thresholds: {
            warningLevel: 100,
            dangerLevel: 150,
            extremeDangerLevel: 200,
            basinSize: 1000,
          },
        },
        forecasts: [{ value: 120, forecastStartTime: '2023-01-01T10:00:00Z' }],
      };
      const stationName = 'Test Station';

      const result = service.formateGfhStationData(
        dateString,
        stationData,
        stationName,
      );

      expect(result).toBeDefined();
      expect(result.forecastDate).toBe(dateString);
      expect(result.stationName).toBe(stationName);
      expect(result.riverGaugeId).toBe('test-gauge');
      expect(result.history).toHaveLength(1);
    });
  });

  describe('saveDataInGfh', () => {
    const mockType = SourceType.WATER_LEVEL;
    const mockRiverBasin = 'test-basin';
    const mockPayload = { station: 'test-station', data: 'test-data' } as any;

    beforeEach(() => {
      mockPrismaService.source.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaService.sourcesData.create.mockResolvedValue({ id: 1 });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaService);
      });
    });

    it('should save data successfully when source exists', async () => {
      const mockTransaction = {
        sourcesData: {
          findFirst: jest.fn().mockResolvedValue({ id: 1 }),
          update: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });

      const result = await service.saveDataInGfh(
        mockType,
        mockRiverBasin,
        mockPayload,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create source and save data when source does not exist', async () => {
      const mockTransaction = {
        sourcesData: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });

      const result = await service.saveDataInGfh(
        mockType,
        mockRiverBasin,
        mockPayload,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
