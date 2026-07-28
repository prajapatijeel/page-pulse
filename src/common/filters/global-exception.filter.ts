import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '@common/middleware/request-id.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.requestId || (request.headers[REQUEST_ID_HEADER] as string) || 'N/A';
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    let message = 'An error occurred';
    let error = 'Internal Server Error';
    let extraFields: Record<string, unknown> = {};

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = { ...(exceptionResponse as Record<string, unknown>) };
      message = (resObj.message as string) || message;
      error = (resObj.error as string) || error;
      delete resObj.message;
      delete resObj.error;
      extraFields = resObj;
    }

    if (status >= 500) {
      const message = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        JSON.stringify({
          event: 'Unhandled exception',
          requestId,
          method: request.method,
          url: request.url,
          statusCode: status,
          message,
          stack,
        }),
        stack,
      );
    } else {
      this.logger.warn(
        JSON.stringify({
          event: 'Request failed',
          requestId,
          method: request.method,
          url: request.url,
          statusCode: status,
          message,
        }),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...extraFields,
    });
  }
}
