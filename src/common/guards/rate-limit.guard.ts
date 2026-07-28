import { ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RateLimitGuard.name);

  protected throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.warn(
      JSON.stringify({
        event: 'Rate limit exceeded',
        requestId: request.requestId || 'N/A',
        clientIp: request.ip || request.socket.remoteAddress || 'unknown',
        endpoint: request.originalUrl || request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      }),
    );

    return Promise.reject(
      new HttpException(
        {
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  }
}
