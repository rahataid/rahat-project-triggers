import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DataSourceEventsListener } from './data-source-events.listener';
import { TriggerService } from 'src/trigger/trigger.service';
import { DataSource } from '@lib/database';
import * as core from '@lib/core';
import { Parser } from 'expr-eval';

// Mock the Parser from expr-eval
jest.mock('expr-eval', () => ({
  Parser: jest.fn(),
}));

// Mock the core library
jest.mock('@lib/core', () => ({
  DATA_SOURCE_EVENTS: {
    DHM: {
      WATER_LEVEL: 'dhm.water_level',
      RAINFALL: 'dhm.rainfall',
    },
    GLOFAS: {
      WATER_LEVEL: 'glofas.water_level',
    },
    GFH: {
      WATER_LEVEL: 'gfh.water_level',
    },
  },
}));

describe('DataSourceEventsListener', () => {
  let listener: DataSourceEventsListener;
  let mockTriggerService: jest.Mocked<TriggerService>;
  let mockParser: any;
  let mockExpression: any;

  const mockTriggerServiceImplementation = {
    findTriggersBySourceAndIndicator: jest.fn(),
    activeAutomatedTriggers: jest.fn(),
  };

  beforeEach(async () => {
    // Setup parser mocks
    mockExpression = {
      evaluate: jest.fn(),
    };

    mockParser = {
      parse: jest.fn().mockReturnValue(mockExpression),
    };

    (Parser as jest.MockedClass<typeof Parser>).mockImplementation(
      () => mockParser,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSourceEventsListener,
        {
          provide: TriggerService,
          useValue: mockTriggerServiceImplementation,
        },
      ],
    }).compile();

    listener = module.get<DataSourceEventsListener>(DataSourceEventsListener);
    mockTriggerService = module.get(TriggerService);

    // Mock the logger
    jest.spyOn(listener['logger'], 'log').mockImplementation();
    jest.spyOn(listener['logger'], 'warn').mockImplementation();
    jest.spyOn(listener['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleDhmWaterLevel', () => {
    const mockEvent: core.DataSourceEventPayload = {
      indicators: [
        {
          indicator: 'WATER_LEVEL',
          value: 150,
          location: {
            type: 'BASIN',
            seriesId: 'station_123',
          },
        } as any,
        {
          indicator: 'WATER_LEVEL',
          value: 200,
          location: {
            type: 'BASIN',
            seriesId: 'station_456',
          },
        } as any,
      ],
    };

    const mockTriggers = [
      {
        uuid: 'trigger-1',
        triggerStatement: {
          stationId: 'station_123',
          sourceSubType: 'water_level',
          operator: '>',
          value: 100,
        },
        phase: { name: 'Phase 1' },
      },
      {
        uuid: 'trigger-2',
        triggerStatement: {
          stationId: 'station_456',
          sourceSubType: 'water_level',
          operator: '>',
          value: 150,
        },
        phase: { name: 'Phase 2' },
      },
    ];

    it('should successfully handle DHM water level event with valid data', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockTriggers,
      );
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);

      // Mock expression evaluation to return true (trigger activated)
      mockExpression.evaluate.mockReturnValue(true);

      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleDhmWaterLevel(mockEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'DHM WATER LEVEL EVENT RECEIVED 2 indicators',
      );
      expect(
        mockTriggerService.findTriggersBySourceAndIndicator,
      ).toHaveBeenCalledWith(DataSource.DHM, 'WATER_LEVEL');
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty indicators array', async () => {
      const emptyEvent = { indicators: [] };

      await listener.handleDhmWaterLevel(emptyEvent);

      expect(listener['logger'].warn).toHaveBeenCalledWith(
        'indicators not found ',
      );
      expect(
        mockTriggerService.findTriggersBySourceAndIndicator,
      ).not.toHaveBeenCalled();
    });

    it('should handle no triggers found', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue([]);

      await listener.handleDhmWaterLevel(mockEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'No triggers found for DHM Water Level event for indicator WATER_LEVEL',
      );
    });

    it('should handle triggers without station ID', async () => {
      const triggersWithoutStationId = [
        {
          uuid: 'trigger-1',
          triggerStatement: {
            sourceSubType: 'water_level',
            operator: '>',
            value: 100,
          },
          phase: { name: 'Phase 1' },
        },
      ];

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        triggersWithoutStationId,
      );

      await listener.handleDhmWaterLevel(mockEvent);

      expect(listener['logger'].warn).toHaveBeenCalledWith(
        'Station ID not found for trigger trigger-1 for WATER LEVEL TRIGGER',
      );
    });

    it('should skip indicators without matching triggers', async () => {
      const eventWithUnmatchedStations = {
        indicators: [
          {
            indicator: 'WATER_LEVEL',
            value: 150,
            location: {
              type: 'BASIN',
              seriesId: 'unmapped_station',
            },
          },
        ],
      };

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockTriggers,
      );

      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleDhmWaterLevel(eventWithUnmatchedStations as any);

      expect(processAndEvaluateTriggersSpy).not.toHaveBeenCalled();
    });

    it('should handle non-BASIN location types', async () => {
      const eventWithNonBasinLocation = {
        indicators: [
          {
            indicator: 'WATER_LEVEL',
            value: 150,
            location: {
              type: 'POINT',
              seriesId: 'some_id',
            },
          },
        ],
      };

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockTriggers,
      );

      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleDhmWaterLevel(eventWithNonBasinLocation as any);

      expect(processAndEvaluateTriggersSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleDhmRainfall', () => {
    const mockRainfallEvent: core.DataSourceEventPayload = {
      indicators: [
        {
          indicator: 'RAINFALL',
          value: 25,
          location: {
            type: 'BASIN',
            seriesId: 'rain_station_1',
          },
        } as any,
      ],
    };

    const mockRainfallTriggers = [
      {
        uuid: 'rain-trigger-1',
        triggerStatement: {
          stationId: 'rain_station_1',
          sourceSubType: 'rainfall',
          operator: '>',
          value: 20,
        },
        phase: { name: 'Rainfall Phase' },
      },
    ];

    it('should successfully handle DHM rainfall event', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockRainfallTriggers,
      );
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);
      mockExpression.evaluate.mockReturnValue(true);

      await listener.handleDhmRainfall(mockRainfallEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'DHM RAIN FALL EVENT RECEIVED 1 indicators',
      );
      expect(
        mockTriggerService.findTriggersBySourceAndIndicator,
      ).toHaveBeenCalledWith(DataSource.DHM, 'RAINFALL');
    });

    it('should handle empty rainfall indicators', async () => {
      const emptyEvent = { indicators: [] };

      await listener.handleDhmRainfall(emptyEvent);

      expect(listener['logger'].warn).toHaveBeenCalledWith(
        'indicators not found ',
      );
    });

    it('should handle no rainfall triggers found', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue([]);

      await listener.handleDhmRainfall(mockRainfallEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'No triggers found for DHM Rainfall event',
      );
    });
  });

  describe('handleGlofasWaterLevel', () => {
    const mockGlofasEvent: core.DataSourceEventPayload = {
      indicators: [
        {
          indicator: 'WATER_LEVEL',
          value: '10/20/30', // Format: 2yr/5yr/20yr return periods
          location: { type: 'GRID' },
        } as any,
      ],
    };

    const mockGlofasTriggers = [
      {
        uuid: 'glofas-trigger-1',
        triggerStatement: {
          sourceSubType: 'two_years_return_period',
          operator: '>',
          value: 5,
          expression: 'two_years_return_period > 5',
        },
        phase: { name: 'Glofas Phase 1' },
      },
      {
        uuid: 'glofas-trigger-2',
        triggerStatement: {
          sourceSubType: 'five_years_return_period',
          operator: '>',
          value: 15,
          expression: 'five_years_return_period > 15',
        },
        phase: { name: 'Glofas Phase 2' },
      },
    ];

    it('should successfully handle GLOFAS water level event', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockGlofasTriggers,
      );
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);
      mockExpression.evaluate.mockReturnValue(true);

      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleGlofasWaterLevel(mockGlofasEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'GLOFAS WATER LEVEL EVENT RECEIVED 1 indicators',
      );
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledTimes(3); // Once for each return period
    });

    it('should handle empty GLOFAS indicators', async () => {
      const emptyEvent = { indicators: [] };

      await listener.handleGlofasWaterLevel(emptyEvent);

      expect(listener['logger'].warn).toHaveBeenCalledWith(
        'indicators not found ',
      );
    });

    it('should handle no GLOFAS triggers found', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue([]);

      await listener.handleGlofasWaterLevel(mockGlofasEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'No triggers found for DHM Rainfall event',
      );
    });

    it('should parse return period values correctly', async () => {
      const eventWithSpaces = {
        indicators: [
          {
            indicator: 'WATER_LEVEL',
            value: ' 15 / 25 / 35 ', // Values with spaces
            location: { type: 'GRID' },
          },
        ],
      };

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockGlofasTriggers,
      );
      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleGlofasWaterLevel(eventWithSpaces as any);

      // The method creates a trigger map, so it will pass the specific triggers for each category
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(
        [mockGlofasTriggers[0]],
        15,
      );
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(
        [mockGlofasTriggers[1]],
        25,
      );
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(undefined, 35); // No twenty_years_return_period trigger
    });

    it('should handle invalid return period values', async () => {
      const eventWithInvalidValues = {
        indicators: [
          {
            indicator: 'WATER_LEVEL',
            value: 'invalid/data/format',
            location: { type: 'GRID' },
          },
        ],
      };

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockGlofasTriggers,
      );
      const processAndEvaluateTriggersSpy = jest.spyOn(
        listener as any,
        'processAndEvaluateTriggers',
      );

      await listener.handleGlofasWaterLevel(eventWithInvalidValues as any);

      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(
        [mockGlofasTriggers[0]],
        0,
      );
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(
        [mockGlofasTriggers[1]],
        0,
      );
      expect(processAndEvaluateTriggersSpy).toHaveBeenCalledWith(undefined, 0); // No twenty_years_return_period trigger
    });
  });

  describe('handleGfsWaterLevel', () => {
    const mockGfsEvent: core.DataSourceEventPayload = {
      indicators: [
        { indicator: 'WATER_LEVEL', value: 100 } as any,
        { indicator: 'WATER_LEVEL', value: 200 } as any,
        { indicator: 'WATER_LEVEL', value: 150 } as any,
      ],
    };

    const mockGfsTriggers = [
      {
        id: 1,
        uuid: 'gfs-trigger-1',
        triggerStatement: {
          sourceSubType: 'mean_water_level',
          operator: '>',
          value: 120,
          expression: 'mean_water_level > 120',
        },
        phase: { name: 'GFS Phase 1' },
      },
    ];

    it('should successfully handle GFS water level event with mean calculation', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockGfsTriggers,
      );
      mockExpression.evaluate.mockReturnValue(true);

      await listener.handleGfsWaterLevel(mockGfsEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'GFS WATER LEVEL EVENT RECEIVED 3 indicators',
      );
      // Mean of [100, 200, 150] = 150
      expect(mockExpression.evaluate).toHaveBeenCalledWith({
        mean_water_level: 150,
      });
    });

    it('should handle empty GFS indicators', async () => {
      const emptyEvent = { indicators: [] };

      await listener.handleGfsWaterLevel(emptyEvent);

      expect(listener['logger'].warn).toHaveBeenCalledWith(
        'indicators not found ',
      );
    });

    it('should handle no GFS triggers found', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue([]);

      await listener.handleGfsWaterLevel(mockGfsEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'No triggers found for DHM Rainfall event',
      );
    });

    it('should log trigger evaluation results', async () => {
      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        mockGfsTriggers,
      );
      mockExpression.evaluate.mockReturnValue(false);

      await listener.handleGfsWaterLevel(mockGfsEvent);

      expect(listener['logger'].log).toHaveBeenCalledWith('Trigger 1 NOT met');
    });
  });

  describe('generateExpression', () => {
    it('should generate correct expression string', () => {
      const triggerStatement = {
        sourceSubType: 'water_level',
        operator: '>',
        value: 100,
      };

      const result = listener['generateExpression'](triggerStatement as any);

      expect(result).toBe('water_level > 100');
    });

    it('should handle different operators', () => {
      const triggerStatement1 = {
        sourceSubType: 'rainfall',
        operator: '>=',
        value: 50,
      };

      const triggerStatement2 = {
        sourceSubType: 'temperature',
        operator: '<',
        value: 30,
      };

      expect(listener['generateExpression'](triggerStatement1 as any)).toBe(
        'rainfall >= 50',
      );
      expect(listener['generateExpression'](triggerStatement2 as any)).toBe(
        'temperature < 30',
      );
    });
  });

  describe('evaluateConditionExpression', () => {
    const mockTriggerStatement = {
      expression: 'water_level > 100',
      sourceSubType: 'water_level',
    };

    it('should successfully evaluate expression and return true', () => {
      mockExpression.evaluate.mockReturnValue(true);

      const result = listener['evaluateConditionExpression'](
        mockTriggerStatement,
        150,
      );

      expect(Parser).toHaveBeenCalledWith({
        operators: {
          logical: true,
          comparison: true,
        },
      });
      expect(mockParser.parse).toHaveBeenCalledWith('water_level > 100');
      expect(mockExpression.evaluate).toHaveBeenCalledWith({
        water_level: 150,
      });
      expect(result).toBe(true);
    });

    it('should successfully evaluate expression and return false', () => {
      mockExpression.evaluate.mockReturnValue(false);

      const result = listener['evaluateConditionExpression'](
        mockTriggerStatement,
        50,
      );

      expect(result).toBe(false);
    });

    it('should handle evaluation errors and return false', () => {
      const error = new Error('Parser error');
      mockParser.parse.mockImplementation(() => {
        throw error;
      });

      const result = listener['evaluateConditionExpression'](
        mockTriggerStatement,
        150,
      );

      expect(listener['logger'].error).toHaveBeenCalledWith(
        'Failed to evaluate expression: water_level > 100',
        error,
      );
      expect(result).toBe(false);
    });

    it('should handle expression evaluation errors', () => {
      const error = new Error('Evaluation error');
      mockExpression.evaluate.mockImplementation(() => {
        throw error;
      });

      const result = listener['evaluateConditionExpression'](
        mockTriggerStatement,
        150,
      );

      expect(listener['logger'].error).toHaveBeenCalledWith(
        'Failed to evaluate expression: water_level > 100',
        error,
      );
      expect(result).toBe(false);
    });

    it('should convert evaluation result to boolean', () => {
      // Test truthy values
      mockExpression.evaluate.mockReturnValue(1);
      expect(
        listener['evaluateConditionExpression'](mockTriggerStatement, 150),
      ).toBe(true);

      mockExpression.evaluate.mockReturnValue('yes');
      expect(
        listener['evaluateConditionExpression'](mockTriggerStatement, 150),
      ).toBe(true);

      // Test falsy values
      mockExpression.evaluate.mockReturnValue(0);
      expect(
        listener['evaluateConditionExpression'](mockTriggerStatement, 150),
      ).toBe(false);

      mockExpression.evaluate.mockReturnValue('');
      expect(
        listener['evaluateConditionExpression'](mockTriggerStatement, 150),
      ).toBe(false);
    });
  });

  describe('processAndEvaluateTriggers', () => {
    const mockTriggers = [
      {
        id: 1,
        uuid: 'trigger-1',
        triggerStatement: {
          sourceSubType: 'water_level',
          operator: '>',
          value: 100,
        },
      },
      {
        id: 2,
        uuid: 'trigger-2',
        triggerStatement: {
          sourceSubType: 'water_level',
          operator: '>',
          value: 200,
        },
      },
    ];

    it('should process triggers and activate those that meet threshold', async () => {
      mockExpression.evaluate
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);

      await listener['processAndEvaluateTriggers'](mockTriggers as any, 150);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        'Trigger trigger-1 MET threshold',
      );
      expect(mockTriggerService.activeAutomatedTriggers).toHaveBeenCalledWith([
        'trigger-1',
      ]);
    });

    it('should handle empty triggers array', async () => {
      await listener['processAndEvaluateTriggers']([], 150);

      expect(mockTriggerService.activeAutomatedTriggers).not.toHaveBeenCalled();
    });

    it('should not activate triggers if none meet threshold', async () => {
      mockExpression.evaluate.mockReturnValue(false);

      await listener['processAndEvaluateTriggers'](mockTriggers as any, 50);

      expect(mockTriggerService.activeAutomatedTriggers).not.toHaveBeenCalled();
    });

    it('should log activation details', async () => {
      mockExpression.evaluate.mockReturnValue(true);
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);

      await listener['processAndEvaluateTriggers'](mockTriggers as any, 150);

      expect(listener['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Activated 2 triggers for GLOFAS Subtype water_level',
        ),
      );
    });
  });

  describe('activateTriggers', () => {
    it('should call triggerService.activeAutomatedTriggers with correct UUIDs', async () => {
      const triggerUuids = ['trigger-1', 'trigger-2', 'trigger-3'];
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);

      await listener['activateTriggers'](triggerUuids);

      expect(mockTriggerService.activeAutomatedTriggers).toHaveBeenCalledWith(
        triggerUuids,
      );
    });

    it('should handle empty array', async () => {
      await listener['activateTriggers']([]);

      expect(mockTriggerService.activeAutomatedTriggers).toHaveBeenCalledWith(
        [],
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockTriggerService.activeAutomatedTriggers.mockRejectedValue(error);

      await expect(listener['activateTriggers'](['trigger-1'])).rejects.toThrow(
        error,
      );
    });
  });

  describe('integration tests', () => {
    it('should handle complete DHM water level flow', async () => {
      const event = {
        indicators: [
          {
            indicator: 'WATER_LEVEL',
            value: 150,
            location: {
              type: 'BASIN',
              seriesId: 'station_123',
            },
          },
        ],
      };

      const triggers = [
        {
          uuid: 'trigger-1',
          triggerStatement: {
            stationId: 'station_123',
            sourceSubType: 'water_level',
            operator: '>',
            value: 100,
          },
          phase: { name: 'Phase 1' },
        },
      ];

      mockTriggerService.findTriggersBySourceAndIndicator.mockResolvedValue(
        triggers,
      );
      mockExpression.evaluate.mockReturnValue(true);
      mockTriggerService.activeAutomatedTriggers.mockResolvedValue(undefined);

      await listener.handleDhmWaterLevel(event as any);

      expect(
        mockTriggerService.findTriggersBySourceAndIndicator,
      ).toHaveBeenCalled();
      expect(mockTriggerService.activeAutomatedTriggers).toHaveBeenCalledWith([
        'trigger-1',
      ]);
    });
  });
});
