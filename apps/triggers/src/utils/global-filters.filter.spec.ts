import { Logger } from '@nestjs/common';
import { setupProcessHandlers } from './global-filters.filter';

describe('setupProcessHandlers', () => {
  let mockLogger: jest.Mocked<Logger>;
  let originalProcessOn: any;
  let originalProcessExit: any;
  let processHandlers: { [key: string]: (...args: any[]) => void } = {};

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Store original process methods
    originalProcessOn = process.on;
    originalProcessExit = process.exit;

    // Mock process.on to capture handlers
    process.on = jest.fn((event: string, handler: (...args: any[]) => void) => {
      processHandlers[event] = handler;
      return process;
    });

    // Mock process.exit
    process.exit = jest.fn();

    // Clear handlers before each test
    processHandlers = {};
  });

  afterEach(() => {
    jest.clearAllMocks();

    // Restore original process methods
    process.on = originalProcessOn;
    process.exit = originalProcessExit;

    // Clear handlers
    processHandlers = {};
  });

  it('should set up all process event handlers', () => {
    setupProcessHandlers(mockLogger);

    expect(process.on).toHaveBeenCalledTimes(4);
    expect(process.on).toHaveBeenCalledWith(
      'unhandledRejection',
      expect.any(Function),
    );
    expect(process.on).toHaveBeenCalledWith(
      'uncaughtException',
      expect.any(Function),
    );
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  describe('unhandledRejection handler', () => {
    it('should log unhandled promise rejection with error object', () => {
      setupProcessHandlers(mockLogger);

      const error = new Error('Test rejection');
      error.stack = 'Error: Test rejection\n    at Test.spec.ts:123:45';
      const mockPromise = {} as Promise<any>; // Mock promise object

      processHandlers['unhandledRejection'](error, mockPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: Test rejection',
        'Error: Test rejection\n    at Test.spec.ts:123:45',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Promise: ${JSON.stringify(mockPromise)}`,
      );
    });

    it('should log unhandled promise rejection with string reason', () => {
      setupProcessHandlers(mockLogger);

      const reason = 'String rejection reason';
      const mockPromise = {} as Promise<any>; // Mock promise object

      processHandlers['unhandledRejection'](reason, mockPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: String rejection reason',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Promise: ${JSON.stringify(mockPromise)}`,
      );
    });

    it('should log unhandled promise rejection with undefined reason', () => {
      setupProcessHandlers(mockLogger);

      const mockPromise = {} as Promise<any>; // Mock promise object

      processHandlers['unhandledRejection'](undefined, mockPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: undefined',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Promise: ${JSON.stringify(mockPromise)}`,
      );
    });

    it('should log unhandled promise rejection with null reason', () => {
      setupProcessHandlers(mockLogger);

      const mockPromise = {} as Promise<any>; // Mock promise object

      processHandlers['unhandledRejection'](null, mockPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: null',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Promise: ${JSON.stringify(mockPromise)}`,
      );
    });

    it('should handle complex object rejection', () => {
      setupProcessHandlers(mockLogger);

      const complexReason = {
        code: 'CUSTOM_ERROR',
        message: 'Complex error object',
        details: { field: 'value' },
      };
      const mockPromise = {} as Promise<any>; // Mock promise object

      processHandlers['unhandledRejection'](complexReason, mockPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: Complex error object',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Promise: ${JSON.stringify(mockPromise)}`,
      );
    });
  });

  describe('uncaughtException handler', () => {
    it('should log uncaught exception and exit gracefully', () => {
      setupProcessHandlers(mockLogger);

      const error = new Error('Uncaught test error');
      error.stack = 'Error: Uncaught test error\n    at Test.spec.ts:45:20';

      processHandlers['uncaughtException'](error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Uncaught Exception: Uncaught test error',
        'Error: Uncaught test error\n    at Test.spec.ts:45:20',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application encountered an uncaught exception. Shutting down gracefully...',
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should handle uncaught exception without message', () => {
      setupProcessHandlers(mockLogger);

      const error = new Error();
      error.stack = 'Error\n    at Test.spec.ts:50:15';

      processHandlers['uncaughtException'](error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Uncaught Exception: ',
        'Error\n    at Test.spec.ts:50:15',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application encountered an uncaught exception. Shutting down gracefully...',
      );
    });

    it('should handle uncaught exception without stack', () => {
      setupProcessHandlers(mockLogger);

      const error = new Error('No stack error');
      delete error.stack;

      processHandlers['uncaughtException'](error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Uncaught Exception: No stack error',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application encountered an uncaught exception. Shutting down gracefully...',
      );
    });
  });

  describe('SIGTERM handler', () => {
    it('should log SIGTERM message and exit with code 0', () => {
      setupProcessHandlers(mockLogger);

      processHandlers['SIGTERM']();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SIGTERM signal received: closing application gracefully',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should only log once on SIGTERM', () => {
      setupProcessHandlers(mockLogger);

      processHandlers['SIGTERM']();

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(1);
    });
  });

  describe('SIGINT handler', () => {
    it('should log SIGINT message and exit with code 0', () => {
      setupProcessHandlers(mockLogger);

      processHandlers['SIGINT']();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SIGINT signal received: closing application gracefully',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should only log once on SIGINT', () => {
      setupProcessHandlers(mockLogger);

      processHandlers['SIGINT']();

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple signal handlers', () => {
    it('should handle multiple different signals independently', () => {
      setupProcessHandlers(mockLogger);

      // Test SIGTERM first
      processHandlers['SIGTERM']();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SIGTERM signal received: closing application gracefully',
      );
      expect(process.exit).toHaveBeenCalledWith(0);

      // Reset mocks
      jest.clearAllMocks();

      // Test SIGINT
      processHandlers['SIGINT']();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SIGINT signal received: closing application gracefully',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('error logging edge cases', () => {
    it('should handle logger methods throwing errors', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockLogger.error.mockImplementation(() => {
        throw new Error('Logger error');
      });

      setupProcessHandlers(mockLogger);

      // Should not throw even if logger fails
      expect(() => {
        processHandlers['uncaughtException'](new Error('Test error'));
      }).not.toThrow();

      // Should fallback to console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Logger failed in uncaughtException handler:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle promise stringify errors', () => {
      setupProcessHandlers(mockLogger);

      // Create a circular object to mock a promise that would cause JSON.stringify to fail
      const circularPromise: any = { type: 'mocked-promise' };
      circularPromise.self = circularPromise;

      processHandlers['unhandledRejection']('test reason', circularPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection: test reason',
        undefined,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Promise: [Circular or non-serializable object]',
      );
    });
  });

  describe('integration with real process events', () => {
    it('should properly register handlers that can be called', () => {
      const mockProcess = {
        on: jest.fn((event: string, handler: Function) => {
          // Simulate the handler being registerable
          return mockProcess;
        }),
        exit: jest.fn(),
      };

      // Temporarily replace process methods
      const originalOn = process.on;
      const originalExit = process.exit;
      process.on = mockProcess.on;
      process.exit = mockProcess.exit;

      setupProcessHandlers(mockLogger);

      expect(mockProcess.on).toHaveBeenCalledWith(
        'unhandledRejection',
        expect.any(Function),
      );
      expect(mockProcess.on).toHaveBeenCalledWith(
        'uncaughtException',
        expect.any(Function),
      );
      expect(mockProcess.on).toHaveBeenCalledWith(
        'SIGTERM',
        expect.any(Function),
      );
      expect(mockProcess.on).toHaveBeenCalledWith(
        'SIGINT',
        expect.any(Function),
      );

      // Restore
      process.on = originalOn;
      process.exit = originalExit;
    });
  });
});
