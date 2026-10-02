import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'rpc') {
      return this.handleRpcException(exception, host);
    }

    return this.handleHttpException(exception, host);
  }

  private handleRpcException(exception: unknown, host: ArgumentsHost) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
        errorDetails = { message: error };
      } else if (error && typeof error === 'object') {
        // object form: new RpcException({ message, code, params })
        message = (error as any).message ?? JSON.stringify(error);
        errorDetails = error;
      } else {
        message = JSON.stringify(error);
        errorDetails = { message };
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorDetails = { statusCode: status, message };
      } else {
        message = (exceptionResponse as any).message || message;
        // preserve any extra fields (e.g. code, params) set via
        // new BadRequestException({ message, code, params })
        errorDetails = { statusCode: status, ...(exceptionResponse as any) };
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        message: exception.message,
        name: exception.name,
        stack:
          process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    this.logger.error(
      `RPC Exception: ${message} | ${exception instanceof Error ? exception.stack : undefined}`,
    );

    return throwError(() => ({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
      code: (errorDetails as any)?.code,
      params: (errorDetails as any)?.params,
      error: errorDetails,
    }));
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let params: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = (exceptionResponse as any).message || message;
        code = (exceptionResponse as any).code;
        params = (exceptionResponse as any).params;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `HTTP Exception: ${message} | Path: ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code,
      params,
    });
  }
}
