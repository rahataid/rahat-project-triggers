import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ProductionOnly } from './production-only.decorator';

// Mock the Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('ProductionOnly Decorator', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    // Clear all mocks
    jest.clearAllMocks();

    // Mock the logger
    const LoggerConstructor = Logger as jest.MockedClass<typeof Logger>;
    const loggerInstance = new LoggerConstructor();
    loggerLogSpy = jest.spyOn(loggerInstance, 'log');
    (Logger as any).mockImplementation(() => loggerInstance);
  });

  beforeEach(() => {
    // Clear environment variables
    delete process.env.NODE_ENV;
  });

  describe('with ConfigService', () => {
    class TestService {
      public methodCalled = false;
      public asyncMethodCalled = false;
      public returnValue: any;

      constructor(public configService: ConfigService) {}

      @ProductionOnly()
      testMethod() {
        this.methodCalled = true;
        return 'executed';
      }

      @ProductionOnly()
      async testAsyncMethod() {
        this.asyncMethodCalled = true;
        return 'async executed';
      }

      @ProductionOnly({ productionValues: ['production', 'staging'] })
      testMethodWithCustomValues() {
        this.methodCalled = true;
        return 'custom executed';
      }

      @ProductionOnly({ logSkipped: false })
      testMethodNoLogging() {
        this.methodCalled = true;
        return 'no log executed';
      }

      @ProductionOnly({ envKey: 'CUSTOM_ENV' })
      testMethodCustomEnv() {
        this.methodCalled = true;
        return 'custom env executed';
      }
    }

    it('should execute method when NODE_ENV is production', () => {
      mockConfigService.get.mockReturnValue('production');
      const service = new TestService(mockConfigService);

      const result = service.testMethod();

      expect(service.methodCalled).toBe(true);
      expect(result).toBe('executed');
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should skip method when NODE_ENV is development', () => {
      mockConfigService.get.mockReturnValue('development');
      const service = new TestService(mockConfigService);

      const result = service.testMethod();

      expect(service.methodCalled).toBe(false);
      expect(result).toBeUndefined();
    });

    it('should skip method when NODE_ENV is undefined', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = new TestService(mockConfigService);

      const result = service.testMethod();

      expect(service.methodCalled).toBe(false);
      expect(result).toBeUndefined();
    });

    it('should work with async methods', async () => {
      mockConfigService.get.mockReturnValue('production');
      const service = new TestService(mockConfigService);

      const result = await service.testAsyncMethod();

      expect(service.asyncMethodCalled).toBe(true);
      expect(result).toBe('async executed');
    });

    it('should respect custom production values', () => {
      mockConfigService.get.mockReturnValue('staging');
      const service = new TestService(mockConfigService);

      const result = service.testMethodWithCustomValues();

      expect(service.methodCalled).toBe(true);
      expect(result).toBe('custom executed');
    });

    it('should skip logging when logSkipped is false', () => {
      mockConfigService.get.mockReturnValue('development');
      const service = new TestService(mockConfigService);

      service.testMethodNoLogging();

      expect(service.methodCalled).toBe(false);
      expect(loggerLogSpy).not.toHaveBeenCalled();
    });

    it('should use custom environment key', () => {
      mockConfigService.get.mockReturnValue('production');
      const service = new TestService(mockConfigService);

      service.testMethodCustomEnv();

      expect(service.methodCalled).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('CUSTOM_ENV');
    });
  });

  describe('without ConfigService (fallback to process.env)', () => {
    class TestServiceWithoutConfig {
      public methodCalled = false;

      @ProductionOnly()
      testMethod() {
        this.methodCalled = true;
        return 'executed';
      }
    }

    it('should execute method when NODE_ENV is production in process.env', () => {
      process.env.NODE_ENV = 'production';
      const service = new TestServiceWithoutConfig();

      const result = service.testMethod();

      expect(service.methodCalled).toBe(true);
      expect(result).toBe('executed');
    });

    it('should skip method when NODE_ENV is development in process.env', () => {
      process.env.NODE_ENV = 'development';
      const service = new TestServiceWithoutConfig();

      const result = service.testMethod();

      expect(service.methodCalled).toBe(false);
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    class TestService {
      public methodCalled = false;
      public configService: ConfigService;

      constructor(configService: ConfigService) {
        this.configService = configService;
      }

      @ProductionOnly()
      testMethod() {
        this.methodCalled = true;
        return 'executed';
      }
    }

    it('should handle null ConfigService', () => {
      process.env.NODE_ENV = 'production';
      const service = new TestService(null as any);

      const result = service.testMethod();

      expect(service.methodCalled).toBe(true);
      expect(result).toBe('executed');
    });

    it('should preserve method context (this)', () => {
      mockConfigService.get.mockReturnValue('production');

      class ContextTestService {
        public value = 'test';
        public configService = mockConfigService;

        @ProductionOnly()
        testMethod() {
          return this.value;
        }
      }

      const service = new ContextTestService();
      const result = service.testMethod();

      expect(result).toBe('test');
    });

    it('should pass through method arguments', () => {
      mockConfigService.get.mockReturnValue('production');

      class ArgsTestService {
        public configService = mockConfigService;

        @ProductionOnly()
        testMethod(arg1: string, arg2: number) {
          return `${arg1}-${arg2}`;
        }
      }

      const service = new ArgsTestService();
      const result = service.testMethod('hello', 42);

      expect(result).toBe('hello-42');
    });

    it('should handle methods that throw errors', () => {
      mockConfigService.get.mockReturnValue('production');

      class ErrorTestService {
        public configService = mockConfigService;

        @ProductionOnly()
        testMethod() {
          throw new Error('Test error');
        }
      }

      const service = new ErrorTestService();

      expect(() => service.testMethod()).toThrow('Test error');
    });

    it('should handle empty production values array', () => {
      mockConfigService.get.mockReturnValue('production');

      class EmptyValuesService {
        public methodCalled = false;
        public configService = mockConfigService;

        @ProductionOnly({ productionValues: [] })
        testMethod() {
          this.methodCalled = true;
        }
      }

      const service = new EmptyValuesService();
      service.testMethod();

      expect(service.methodCalled).toBe(false);
    });
  });

  describe('multiple decorators on same class', () => {
    it('should handle multiple decorated methods independently', () => {
      class MultiMethodService {
        public method1Called = false;
        public method2Called = false;
        public configService = mockConfigService;

        @ProductionOnly()
        method1() {
          this.method1Called = true;
        }

        @ProductionOnly({ productionValues: ['staging'] })
        method2() {
          this.method2Called = true;
        }
      }

      mockConfigService.get.mockReturnValue('production');
      const service = new MultiMethodService();

      service.method1();
      service.method2();

      expect(service.method1Called).toBe(true);
      expect(service.method2Called).toBe(false);
    });
  });
});
