import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
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

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as jest.Mocked<ArgumentsHost>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const mockHttpException = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(mockHttpException, mockArgumentsHost);

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

      filter.catch(mockHttpException, mockArgumentsHost);

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

      filter.catch(mockHttpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error',
      });
    });

    it('should handle regular Error instances', () => {
      const regularError = new Error('Something went wrong');

      filter.catch(regularError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Something went wrong',
      });
    });

    it('should handle unknown exceptions', () => {
      const unknownException = 'String exception';

      filter.catch(unknownException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error',
      });
    });

    it('should handle null exceptions', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error',
      });
    });

    it('should handle undefined exceptions', () => {
      filter.catch(undefined, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Internal server error',
      });
    });

    it('should handle different HTTP status codes', () => {
      const notFoundException = new HttpException(
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );

      filter.catch(notFoundException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: 'Resource not found',
      });
    });

    it('should generate correct timestamp format', () => {
      const mockException = new Error('Test error');
      const beforeTime = new Date().toISOString();

      filter.catch(mockException, mockArgumentsHost);

      const calledArgs = mockResponse.json.mock.calls[0][0];
      const afterTime = new Date().toISOString();

      expect(calledArgs.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(calledArgs.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(calledArgs.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include correct request path', () => {
      mockRequest.url = '/api/v1/users/123';
      const mockException = new Error('Test error');

      filter.catch(mockException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/v1/users/123',
        }),
      );
    });

    it('should handle complex nested exception responses', () => {
      const complexResponse = {
        message: ['First validation error', 'Second validation error'],
        error: 'Bad Request',
        statusCode: 400,
      };
      const mockHttpException = new HttpException(
        complexResponse,
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(mockHttpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        message: ['First validation error', 'Second validation error'],
      });
    });
  });
});
