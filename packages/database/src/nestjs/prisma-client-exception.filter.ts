import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { Prisma } from '../../generated/prisma';

export interface PrismaErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: any;
}

/**
 * Global exception filter for Prisma Client errors
 *
 * Handles common Prisma errors and converts them to appropriate HTTP responses
 * Error codes reference: https://www.prisma.io/docs/reference/api-reference/error-reference#prisma-client-query-engine
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientRustPanicError,

    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log the exception with context
    this.logger.error(
      `Prisma error occurred: ${exception.message} | Code: ${(exception as any).code} | Method: ${request.method} | URL: ${request.url} `,
    );

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handleKnownRequestError(exception, response);
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.handleUnknownRequestError(exception, response);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.handleValidationError(exception, response);
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.handleInitializationError(exception, response);
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      this.handleRustPanicError(exception, response);
    } else {
      this.handleGenericError(exception, response);
    }
  }

  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
  ): void {
    switch (exception.code) {
      case 'P2000':
        this.sendErrorResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Value too long',
          'The provided value is too long for the field',
          exception,
        );
        break;
      case 'P2001':
        this.sendErrorResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Record not found',
          'The record searched for in the where condition does not exist',
          exception,
        );
        break;
      case 'P2002':
        this.sendErrorResponse(
          response,
          HttpStatus.CONFLICT,
          'Unique constraint violation',
          this.extractUniqueConstraintError(exception),
          exception,
        );
        break;
      case 'P2003':
        this.sendErrorResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Foreign key constraint violation',
          'Foreign key constraint failed on the field',
          exception,
        );
        break;
      case 'P2004':
        this.sendErrorResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Constraint violation',
          'A constraint failed on the database',
          exception,
        );
        break;
      case 'P2025':
        this.sendErrorResponse(
          response,
          HttpStatus.NOT_FOUND,
          'Record not found',
          'An operation failed because it depends on one or more records that were required but not found',
          exception,
        );
        break;
      case 'P2034':
        this.sendErrorResponse(
          response,
          HttpStatus.CONFLICT,
          'Transaction conflict',
          'Transaction failed due to a write conflict or a deadlock',
          exception,
        );
        break;
      default:
        this.sendErrorResponse(
          response,
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Database error',
          this.cleanUpException(exception),
          exception,
        );
        break;
    }
  }

  private handleUnknownRequestError(
    exception: Prisma.PrismaClientUnknownRequestError,
    response: Response,
  ): void {
    this.sendErrorResponse(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Unknown database error',
      'An unknown error occurred while processing the database request',
      exception,
    );
  }

  private handleInitializationError(
    exception: Prisma.PrismaClientInitializationError,
    response: Response,
  ): void {
    this.logger.error(
      `Prisma initialization error occurred: ${exception.message} 
      Code: ${(exception as any).code} `,
    );
    this.sendErrorResponse(
      response,
      HttpStatus.SERVICE_UNAVAILABLE,
      'Service unavailable',
      'The database connection is not available',
      exception,
    );
  }

  private handleValidationError(
    exception: Prisma.PrismaClientValidationError,
    response: Response,
  ): void {
    this.sendErrorResponse(
      response,
      HttpStatus.BAD_REQUEST,
      'Validation error',
      'Invalid data provided to the database query',
      exception,
    );
  }

  private handleRustPanicError(
    exception: Prisma.PrismaClientRustPanicError,
    response: Response,
  ): void {
    this.logger.error(`Prisma Rust panic error occurred: ${exception.message}`);
    this.sendErrorResponse(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Critical database error',
      'A critical error occurred in the database engine',
      exception,
    );
  }

  private handleGenericError(exception: any, response: Response): void {
    this.sendErrorResponse(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
      'An unexpected error occurred',
      exception,
    );
  }

  private sendErrorResponse(
    response: Response,
    statusCode: number,
    error: string,
    message: string,
    exception: any,
  ): void {
    const errorResponse: PrismaErrorResponse = {
      statusCode,
      message,
      error,
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          code: exception.code,
          clientVersion: exception.clientVersion,
          meta: exception.meta,
        },
      }),
    };

    response.status(statusCode).json(errorResponse);
  }

  private extractUniqueConstraintError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    if (exception.meta?.target) {
      const fields = Array.isArray(exception.meta.target)
        ? exception.meta.target.join(', ')
        : exception.meta.target;
      return `A record with the same ${fields} already exists`;
    }
    return 'A record with the same unique field already exists';
  }

  /**
   * Clean up exception message for user-friendly display
   * @param exception - The exception to clean up
   * @returns Cleaned exception message
   */
  private cleanUpException(exception: Error): string {
    return exception.message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
