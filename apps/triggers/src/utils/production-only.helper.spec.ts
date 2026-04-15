import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Create the logger instance and spy before importing the helper
const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

// Mock the Logger before importing the helper
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => mockLoggerInstance),
}));

// Import the helper AFTER the mock is set up
import { runInProductionOnly } from './production-only.helper';

describe('runInProductionOnly Helper', () => {
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    // Clear all mocks
    jest.clearAllMocks();
    mockLoggerInstance.log.mockClear();
  });

  describe('basic functionality', () => {
    it('should execute function when NODE_ENV is production', () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
        return 'executed';
      };

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
      );

      expect(functionExecuted).toBe(true);
      expect(result).toBe('executed');
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should skip function when NODE_ENV is development', () => {
      mockConfigService.get.mockReturnValue('development');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
        return 'executed';
      };

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
      );

      expect(functionExecuted).toBe(false);
      expect(result).toBeUndefined();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        'Skipping testMethod() - Not in production (NODE_ENV=development)',
      );
    });

    it('should skip function when NODE_ENV is undefined', () => {
      mockConfigService.get.mockReturnValue(undefined);
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
      );

      expect(functionExecuted).toBe(false);
      expect(result).toBeUndefined();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        'Skipping testMethod() - Not in production (NODE_ENV=undefined)',
      );
    });

    it('should work without method name', () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn);

      expect(functionExecuted).toBe(true);
    });

    it('should not log when method name is not provided and skipped', () => {
      mockConfigService.get.mockReturnValue('development');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn);

      expect(functionExecuted).toBe(false);
      expect(mockLoggerInstance.log).not.toHaveBeenCalled();
    });
  });

  describe('async function support', () => {
    it('should execute async function when in production', async () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = async () => {
        functionExecuted = true;
        return 'async executed';
      };

      const result = await runInProductionOnly(
        mockConfigService,
        testFn,
        'asyncMethod',
      );

      expect(functionExecuted).toBe(true);
      expect(result).toBe('async executed');
    });

    it('should skip async function when not in production', async () => {
      mockConfigService.get.mockReturnValue('development');
      let functionExecuted = false;
      const testFn = async () => {
        functionExecuted = true;
        return 'async executed';
      };

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'asyncMethod',
      );

      expect(functionExecuted).toBe(false);
      expect(result).toBeUndefined();
    });
  });

  describe('custom options', () => {
    it('should respect custom production values', () => {
      mockConfigService.get.mockReturnValue('staging');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
        return 'custom executed';
      };

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
        { productionValues: ['production', 'staging'] },
      );

      expect(functionExecuted).toBe(true);
      expect(result).toBe('custom executed');
    });

    it('should use custom environment key', () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn, 'testMethod', {
        envKey: 'CUSTOM_ENV',
      });

      expect(functionExecuted).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('CUSTOM_ENV');
    });

    it('should skip logging when logSkipped is false', () => {
      mockConfigService.get.mockReturnValue('development');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn, 'testMethod', {
        logSkipped: false,
      });

      expect(functionExecuted).toBe(false);
      expect(mockLoggerInstance.log).not.toHaveBeenCalled();
    });

    it('should handle empty production values array', () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn, 'testMethod', {
        productionValues: [],
      });

      expect(functionExecuted).toBe(false);
    });

    it('should use default values when options is undefined', () => {
      mockConfigService.get.mockReturnValue('production');
      let functionExecuted = false;
      const testFn = () => {
        functionExecuted = true;
      };

      runInProductionOnly(mockConfigService, testFn, 'testMethod', undefined);

      expect(functionExecuted).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from the executed function', () => {
      mockConfigService.get.mockReturnValue('production');
      const testFn = () => {
        throw new Error('Test error');
      };

      expect(() =>
        runInProductionOnly(mockConfigService, testFn, 'testMethod'),
      ).toThrow('Test error');
    });

    it('should propagate async errors from the executed function', async () => {
      mockConfigService.get.mockReturnValue('production');
      const testFn = async () => {
        throw new Error('Async test error');
      };

      await expect(
        runInProductionOnly(mockConfigService, testFn, 'asyncMethod'),
      ).rejects.toThrow('Async test error');
    });

    it('should not execute function or throw when not in production', () => {
      mockConfigService.get.mockReturnValue('development');
      const testFn = () => {
        throw new Error('Should not be executed');
      };

      expect(() =>
        runInProductionOnly(mockConfigService, testFn, 'testMethod'),
      ).not.toThrow();
    });
  });

  describe('return value handling', () => {
    it('should return the result of the executed function', () => {
      mockConfigService.get.mockReturnValue('production');
      const expectedResult = { data: 'test' };
      const testFn = () => expectedResult;

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
      );

      expect(result).toBe(expectedResult);
    });

    it('should return undefined when function is skipped', () => {
      mockConfigService.get.mockReturnValue('development');
      const testFn = () => ({ data: 'test' });

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'testMethod',
      );

      expect(result).toBeUndefined();
    });

    it('should return Promise when async function is executed', async () => {
      mockConfigService.get.mockReturnValue('production');
      const expectedResult = { data: 'async test' };
      const testFn = async () => expectedResult;

      const result = runInProductionOnly(
        mockConfigService,
        testFn,
        'asyncMethod',
      );

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(expectedResult);
    });
  });

  describe('logging behavior', () => {
    it('should log with correct format when method is skipped', () => {
      mockConfigService.get.mockReturnValue('development');
      const testFn = () => {};

      runInProductionOnly(mockConfigService, testFn, 'myTestMethod');

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        'Skipping myTestMethod() - Not in production (NODE_ENV=development)',
      );
    });

    it('should log with custom env key in message', () => {
      mockConfigService.get.mockReturnValue('development');
      const testFn = () => {};

      runInProductionOnly(mockConfigService, testFn, 'myTestMethod', {
        envKey: 'APP_ENV',
      });

      expect(mockLoggerInstance.log).toHaveBeenCalledWith(
        'Skipping myTestMethod() - Not in production (APP_ENV=development)',
      );
    });

    it('should not log when function is executed in production', () => {
      mockConfigService.get.mockReturnValue('production');
      const testFn = () => {};

      runInProductionOnly(mockConfigService, testFn, 'testMethod');

      expect(mockLoggerInstance.log).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple calls with different environments', () => {
      let call1Executed = false;
      let call2Executed = false;

      const testFn1 = () => {
        call1Executed = true;
      };
      const testFn2 = () => {
        call2Executed = true;
      };

      // First call - production
      mockConfigService.get.mockReturnValue('production');
      runInProductionOnly(mockConfigService, testFn1, 'method1');

      // Second call - development
      mockConfigService.get.mockReturnValue('development');
      runInProductionOnly(mockConfigService, testFn2, 'method2');

      expect(call1Executed).toBe(true);
      expect(call2Executed).toBe(false);
    });

    it('should work with real-world bootstrap scenario', () => {
      mockConfigService.get.mockReturnValue('production');

      let syncDataCalled = false;
      let syncOtherDataCalled = false;
      let alwaysRunCalled = false;

      const syncData = () => {
        syncDataCalled = true;
      };
      const syncOtherData = () => {
        syncOtherDataCalled = true;
      };
      const alwaysRun = () => {
        alwaysRunCalled = true;
      };

      // Simulate bootstrap method
      runInProductionOnly(mockConfigService, syncData, 'syncData');
      runInProductionOnly(mockConfigService, syncOtherData, 'syncOtherData');
      alwaysRun(); // This one always runs

      expect(syncDataCalled).toBe(true);
      expect(syncOtherDataCalled).toBe(true);
      expect(alwaysRunCalled).toBe(true);
    });
  });
});

