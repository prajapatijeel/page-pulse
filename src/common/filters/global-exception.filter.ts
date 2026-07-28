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
    const path = request.originalUrl || request.url;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const responseBody = this.toResponseBody(exceptionResponse);
    const errorCode = this.getErrorCode(status, responseBody.errorCode);
    const message = this.getClientMessage(status, responseBody.message, errorCode);

    this.logException(exception, requestId, request.method, path, status);

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path,
      requestId,
      ...(responseBody.fieldErrors ? { fieldErrors: responseBody.fieldErrors } : {}),
    });
  }

  private toResponseBody(response: unknown): {
    errorCode?: string;
    fieldErrors?: unknown;
    message?: unknown;
  } {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      return {
        errorCode: typeof body.errorCode === 'string' ? body.errorCode : undefined,
        fieldErrors: Array.isArray(body.fieldErrors) ? body.fieldErrors : undefined,
        message: body.message,
      };
    }

    return {};
  }

  private getErrorCode(status: number, customErrorCode?: string): string {
    if (customErrorCode && /^[A-Z][A-Z0-9_]*$/.test(customErrorCode)) {
      return customErrorCode;
    }

    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
      [HttpStatus.REQUEST_TIMEOUT]: 'REQUEST_TIMEOUT',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
    };

    return errorCodes[status] ?? 'INTERNAL_SERVER_ERROR';
  }

  private getClientMessage(status: number, rawMessage: unknown, errorCode: string): string {
    if (errorCode === 'VALIDATION_ERROR') {
      return 'Validation failed.';
    }

    if (status >= 500) {
      const safeMessages: Record<number, string> = {
        [HttpStatus.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
        [HttpStatus.GATEWAY_TIMEOUT]: 'The upstream service did not respond in time.',
      };
      return safeMessages[status] ?? 'Internal server error.';
    }

    return typeof rawMessage === 'string' ? rawMessage : 'Request could not be processed.';
  }

  private logException(
    exception: unknown,
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
  ): void {
    const originalError = this.serializeException(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      JSON.stringify({
        event: 'Request failed',
        requestId,
        method,
        path,
        statusCode,
        originalError,
      }),
      stack,
    );
  }

  private serializeException(exception: unknown): unknown {
    if (exception instanceof Error) {
      return { name: exception.name, message: exception.message, stack: exception.stack };
    }

    try {
      return JSON.parse(JSON.stringify(exception));
    } catch {
      return String(exception);
    }
  }
}
