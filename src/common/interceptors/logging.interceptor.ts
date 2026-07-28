import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const requestId = req.requestId || 'N/A';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(req, method, originalUrl, requestId, res.statusCode, startTime),
        error: (error: unknown) =>
          this.logRequest(
            req,
            method,
            originalUrl,
            requestId,
            error instanceof HttpException ? error.getStatus() : 500,
            startTime,
          ),
      }),
    );
  }

  private logRequest(
    req: Request,
    method: string,
    url: string,
    requestId: string,
    statusCode: number,
    startTime: number,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'Request completed',
        requestId,
        method,
        url,
        statusCode,
        responseTime: `${Date.now() - startTime}ms`,
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      }),
    );
  }
}
