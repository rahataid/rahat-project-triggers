import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
  let mockRpcArgumentsHost: any;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-endpoint',
      method: 'GET',
      headers: {},
    };

    mockHttpArgumentsHost = {
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    };

    mockRpcArgumentsHost = {
      getData: jest.fn(),
      getContext: jest.fn(),
    };

    mockArgumentsHost = {
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      switchToRpc: jest.fn().mockReturnValue(mockRpcArgumentsHost),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToWs: jest.fn(),
    } as jest.Mocked<ArgumentsHost>;

    // Mock logger
    jest.spyOn(filter['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle RPC context', () => {
      mockArgumentsHost.getType.mockReturnValue('rpc' as any);
      const handleRpcExceptionSpy = jest.spyOn(
        filter as any,
        'handleRpcException',
      );

      const mockException = new Error('Test error');
      filter.catch(mockException, mockArgumentsHost);

      expect(mockArgumentsHost.getType).toHaveBeenCalled();
      expect(handleRpcExceptionSpy).toHaveBeenCalledWith(
        mockException,
        mockArgumentsHost,
      );
    });

    it('should handle HTTP context', () => {
      mockArgumentsHost.getType.mockReturnValue('http' as any);
      const handleHttpExceptionSpy = jest.spyOn(
        filter as any,
        'handleHttpException',
      );

      const mockException = new Error('Test error');
      filter.catch(mockException, mockArgumentsHost);

      expect(mockArgumentsHost.getType).toHaveBeenCalled();
      expect(handleHttpExceptionSpy).toHaveBeenCalledWith(
        mockException,
        mockArgumentsHost,
      );
    });

    it('should default to HTTP context when context type is not RPC', () => {
      mockArgumentsHost.getType.mockReturnValue('ws' as any);
      const handleHttpExceptionSpy = jest.spyOn(
        filter as any,
        'handleHttpException',
      );

      const mockException = new Error('Test error');
      filter.catch(mockException, mockArgumentsHost);

      expect(handleHttpExceptionSpy).toHaveBeenCalledWith(
        mockException,
        mockArgumentsHost,
      );
    });
  });

  describe('handleRpcException', () => {
    beforeEach(() => {
      mockArgumentsHost.getType.mockReturnValue('rpc' as any);
    });

    it('should handle RpcException correctly', () => {
      const errorData = { code: 'TEST_ERROR', details: 'Test details' };
      const mockRpcException = new RpcException(errorData);

      const result = filter['handleRpcException'](
        mockRpcException,
        mockArgumentsHost,
      );

      expect(filter['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('RPC Exception:'),
      );

      // Test that it returns an observable with correct structure
      result.subscribe({
        error: (error) => {
          expect(error).toEqual({
            statusCode: 500,
            timestamp: expect.any(String),
            message: JSON.stringify(errorData),
            error: errorData,
          });
        },
      });
    });

    it('should handle RpcException with string error', () => {
      const errorMessage = 'Simple error message';
      const mockRpcException = new RpcException(errorMessage);

      const result = filter['handleRpcException'](
        mockRpcException,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          expect(error).toEqual({
            statusCode: 500,
            timestamp: expect.any(String),
            message: errorMessage,
            error: { message: errorMessage },
          });
        },
      });
    });

    it('should handle HttpException in RPC context', () => {
      const mockHttpException = new HttpException(
        'Not Found',
        HttpStatus.NOT_FOUND,
      );

      const result = filter['handleRpcException'](
        mockHttpException,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          expect(error).toEqual({
            statusCode: 404, // Uses the actual HTTP status code
            timestamp: expect.any(String),
            message: 'Not Found',
            error: { statusCode: 404, message: 'Not Found' },
          });
        },
      });
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: 'Validation failed',
        error: 'Bad Request',
      };
      const mockHttpException = new HttpException(
        exceptionResponse,
        HttpStatus.BAD_REQUEST,
      );

      const result = filter['handleRpcException'](
        mockHttpException,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          expect(error.message).toBe('Validation failed');
          expect(error.statusCode).toBe(400); // Uses the actual HTTP status from the HttpException
        },
      });
    });

    it('should handle regular Error instances', () => {
      const regularError = new Error('Regular error');
      regularError.stack = 'Error: Regular error\n    at test.js:1:1';

      const result = filter['handleRpcException'](
        regularError,
        mockArgumentsHost,
      );

      expect(filter['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('RPC Exception: Regular error'),
      );

      result.subscribe({
        error: (error) => {
          expect(error).toEqual({
            statusCode: 500,
            timestamp: expect.any(String),
            message: 'Regular error',
            error: {
              message: 'Regular error',
              name: 'Error',
              stack: undefined, // Stack should be undefined unless NODE_ENV is development
            },
          });
        },
      });
    });

    it('should include stack in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const regularError = new Error('Dev error');
      regularError.stack = 'Error: Dev error\n    at test.js:1:1';

      const result = filter['handleRpcException'](
        regularError,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          expect(error.error.stack).toBe(
            'Error: Dev error\n    at test.js:1:1',
          );
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown exceptions', () => {
      const unknownException = 'String exception';

      const result = filter['handleRpcException'](
        unknownException,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          expect(error).toEqual({
            statusCode: 500,
            timestamp: expect.any(String),
            message: 'Internal server error',
            error: {},
          });
        },
      });
    });

    it('should generate correct timestamp format', () => {
      const mockException = new Error('Test error');
      const beforeTime = Date.now();

      const result = filter['handleRpcException'](
        mockException,
        mockArgumentsHost,
      );

      result.subscribe({
        error: (error) => {
          const afterTime = Date.now();
          const timestampTime = new Date(error.timestamp).getTime();
          expect(error.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );
          expect(timestampTime).toBeGreaterThanOrEqual(beforeTime);
          expect(timestampTime).toBeLessThanOrEqual(afterTime);
        },
      });
    });
  });

  describe('handleHttpException', () => {
    beforeEach(() => {
      mockArgumentsHost.getType.mockReturnValue('http' as any);
    });

    it('should handle HttpException correctly', () => {
      const mockHttpException = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter['handleHttpException'](mockHttpException, mockArgumentsHost);

      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
      expect(mockHttpArgumentsHost.getResponse).toHaveBeenCalled();
      expect(mockHttpArgumentsHost.getRequest).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Bad Request',
      });
      expect(filter['logger'].error).toHaveBeenCalledWith(
        'HTTP Exception: Bad Request | Path: /test-endpoint',
        expect.any(String), // HttpException might have a stack trace in test environment
      );
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: 'Validation failed',
        error: 'Bad Request',
        statusCode: 400,
      };
      const mockHttpException = new HttpException(
        exceptionResponse,
        HttpStatus.BAD_REQUEST,
      );

      filter['handleHttpException'](mockHttpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Validation failed',
      });
    });

    it('should handle HttpException with object response without message', () => {
      const exceptionResponse = {
        error: 'Bad Request',
        statusCode: 400,
      };
      const mockHttpException = new HttpException(
        exceptionResponse,
        HttpStatus.BAD_REQUEST,
      );

      filter['handleHttpException'](mockHttpException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error', // Fallback message
      });
    });

    it('should handle regular Error instances', () => {
      const regularError = new Error('Something went wrong');
      regularError.stack = 'Error: Something went wrong\n    at test.js:1:1';

      filter['handleHttpException'](regularError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Something went wrong',
      });
      expect(filter['logger'].error).toHaveBeenCalledWith(
        'HTTP Exception: Something went wrong | Path: /test-endpoint',
        'Error: Something went wrong\n    at test.js:1:1',
      );
    });

    it('should handle unknown exceptions', () => {
      const unknownException = 'String exception';

      filter['handleHttpException'](unknownException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error',
      });
      expect(filter['logger'].error).toHaveBeenCalledWith(
        'HTTP Exception: Internal server error | Path: /test-endpoint',
        undefined,
      );
    });

    it('should handle different HTTP status codes', () => {
      const notFoundException = new HttpException(
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );

      filter['handleHttpException'](notFoundException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Resource not found',
      });
    });

    it('should include correct request path', () => {
      mockRequest.url = '/api/v1/users/123';
      const mockException = new Error('Test error');

      filter['handleHttpException'](mockException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/v1/users/123',
        }),
      );
      expect(filter['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Path: /api/v1/users/123'),
        expect.any(String),
      );
    });

    it('should generate correct timestamp format', () => {
      const mockException = new Error('Test error');
      const beforeTime = Date.now();

      filter['handleHttpException'](mockException, mockArgumentsHost);

      const calledArgs = mockResponse.json.mock.calls[0][0];
      const afterTime = Date.now();
      const timestampTime = new Date(calledArgs.timestamp).getTime();

      expect(calledArgs.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(timestampTime).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampTime).toBeLessThanOrEqual(afterTime);
    });
  });
});
