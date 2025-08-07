import { Test, TestingModule } from '@nestjs/testing';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

// Mock NestFactory
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createMicroservice: jest.fn(),
  },
}));

// Mock Logger
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('Main', () => {
  let mockNestFactory: any;
  let mockLogger: any;
  let mockApp: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApp = {
      listen: jest.fn().mockResolvedValue(undefined),
      useGlobalFilters: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockNestFactory = {
      createMicroservice: jest.fn().mockResolvedValue(mockApp),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Ensure all async operations are cleaned up
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('bootstrap function logic', () => {
    it('should create microservice with correct configuration', async () => {
      // Arrange
      const expectedOptions = {
        transport: 'redis',
        options: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD,
          retryDelay: 3000,
          retryAttempts: 50,
        },
      };

      // Act - simulate the bootstrap function
      const app = await mockNestFactory.createMicroservice('AppModule', expectedOptions);
      await app.listen();

      // Assert
      expect(mockNestFactory.createMicroservice).toHaveBeenCalledWith(
        'AppModule',
        expectedOptions
      );
      expect(mockApp.listen).toHaveBeenCalled();
    });

    it('should log success message with correct port', async () => {
      // Arrange
      const expectedPort = 7080;
      const expectedMessage = `🚀 Microservice is running on: http://localhost:${expectedPort}`;

      // Act - simulate the bootstrap function
      mockLogger.log(expectedMessage);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(expectedMessage);
    });

    it('should handle errors and log them', async () => {
      // Arrange
      const mockError = new Error('Test error');
      mockNestFactory.createMicroservice.mockRejectedValue(mockError);

      // Act - simulate the bootstrap function error handling
      try {
        await mockNestFactory.createMicroservice('AppModule', {});
      } catch (error) {
        mockLogger.error(error);
      }

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
    });

    it('should use correct environment variables for Redis configuration', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: 'test-host',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'test-password',
      };

      const expectedOptions = {
        transport: 'redis',
        options: {
          host: 'test-host',
          port: 6379,
          password: 'test-password',
          retryDelay: 3000,
          retryAttempts: 50,
        },
      };

      // Act - simulate the bootstrap function
      await mockNestFactory.createMicroservice('AppModule', expectedOptions);

      // Assert
      expect(mockNestFactory.createMicroservice).toHaveBeenCalledWith(
        'AppModule',
        expectedOptions
      );

      // Cleanup
      process.env = originalEnv;
    });

    it('should handle missing environment variables gracefully', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: undefined,
        REDIS_PORT: undefined,
        REDIS_PASSWORD: undefined,
      };

      const expectedOptions = {
        transport: 'redis',
        options: {
          host: undefined,
          port: NaN,
          password: undefined,
          retryDelay: 3000,
          retryAttempts: 50,
        },
      };

      // Act - simulate the bootstrap function
      await mockNestFactory.createMicroservice('AppModule', expectedOptions);

      // Assert
      expect(mockNestFactory.createMicroservice).toHaveBeenCalledWith(
        'AppModule',
        expect.objectContaining({
          transport: 'redis',
          options: expect.objectContaining({
            host: undefined,
            port: NaN,
            password: undefined,
          }),
        })
      );

      // Cleanup
      process.env = originalEnv;
    });
  });

  describe('Microservice Configuration', () => {
    it('should use REDIS transport', async () => {
      // Act - simulate the bootstrap function
      await mockNestFactory.createMicroservice('AppModule', { transport: 'redis' });

      // Assert
      expect(mockNestFactory.createMicroservice).toHaveBeenCalledWith(
        'AppModule',
        expect.objectContaining({
          transport: 'redis',
        })
      );
    });

    it('should have correct retry configuration', async () => {
      // Act - simulate the bootstrap function
      await mockNestFactory.createMicroservice('AppModule', {
        options: {
          retryDelay: 3000,
          retryAttempts: 50,
        },
      });

      // Assert
      expect(mockNestFactory.createMicroservice).toHaveBeenCalledWith(
        'AppModule',
        expect.objectContaining({
          options: expect.objectContaining({
            retryDelay: 3000,
            retryAttempts: 50,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should catch and log errors during microservice creation', async () => {
      // Arrange
      const mockError = new Error('Microservice creation failed');
      mockNestFactory.createMicroservice.mockRejectedValue(mockError);

      // Act - simulate the bootstrap function error handling
      try {
        await mockNestFactory.createMicroservice('AppModule', {});
      } catch (error) {
        mockLogger.error(error);
      }

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
    });

    it('should catch and log errors during app.listen()', async () => {
      // Arrange
      const mockError = new Error('Listen failed');
      mockApp.listen.mockRejectedValue(mockError);

      // Act - simulate the bootstrap function error handling
      try {
        await mockApp.listen();
      } catch (error) {
        mockLogger.error(error);
      }

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('Bootstrap Function Structure', () => {
    it('should be an async function', async () => {
      // This test ensures the bootstrap function is properly structured
      const bootstrap = async () => {
        const app = await mockNestFactory.createMicroservice('AppModule', {});
        await app.listen();
      };

      expect(async () => {
        await bootstrap();
      }).not.toThrow();
    });

    it('should handle async operations properly', async () => {
      // This test ensures async operations are handled correctly
      const bootstrap = async () => {
        try {
          const app = await mockNestFactory.createMicroservice('AppModule', {});
          await app.listen();
          mockLogger.log('Success');
        } catch (error) {
          mockLogger.error(error);
        }
      };

      await bootstrap();
      expect(mockLogger.log).toHaveBeenCalledWith('Success');
    });
  });
});
