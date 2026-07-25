/**
 * ============================================================
 * Audit Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Business domain orchestrator for URL audits.
 *
 * RESPONSIBILITIES & FLOW:
 * 1. Check Redis for a cached response using normalized URL key.
 *    - CACHE HIT: Return cached payload immediately (`cached: true`). Bypasses network & DB.
 * 2. Create initial database record (`status = PENDING`).
 * 3. Log `Audit Started` and `Request Sent`.
 * 4. Execute HTTP fetch via `UrlFetcherService` (configurable timeout via `AUDIT_REQUEST_TIMEOUT`).
 * 5. On Successful Fetch:
 *    - Parse HTML metadata (`title`, `description`, `contentLength`, `https`) via `HtmlParserService`.
 *    - Persist `COMPLETED` audit record with HTTP metrics and metadata in PostgreSQL.
 *    - Store in Redis cache with `CACHE_TTL`.
 *    - Log `Request Completed`.
 *    - Return 201 Created payload (`cached: false`).
 * 6. On Request Timeout (`failureReason === 'TIMEOUT'`):
 *    - Log `Request Timed Out`.
 *    - Persist `status = FAILED`, `failureReason = TIMEOUT`, `errorMessage = Request timed out`, `responseTime` in DB.
 *    - Throw NestJS `GatewayTimeoutException` (HTTP 504) returning structured error response.
 * 7. On Other Network Failure (DNS, SSL, Connection Refused, Network Unreachable, Redirects):
 *    - Log `Audit Failed`.
 *    - Persist `status = FAILED` with categorized `failureReason` and `errorMessage` in DB.
 *    - Return structured error payload (`cached: false`).
 * ============================================================
 */

import { GatewayTimeoutException, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { ApiResponse } from '@common/responses/api-response.interface';
import { AuditRepository } from '../repositories/audit.repository';
import { UrlFetcherService } from './url-fetcher.service';
import { HtmlParserService } from './html-parser.service';
import { CacheService } from '../../../shared/redis/cache.service';
import { AppConfigService } from '@config/app-config.service';
import { CreateAuditDto } from '../dto/create-audit.dto';
import { AuditStatus } from '../constants/audit-status.enum';
import { generateCacheKey } from '../utils/url-normalizer.util';
import { REQUEST_ID_HEADER } from '@common/middleware/request-id.middleware';

export interface AuditSuccessData {
  id: string;
  url: string;
  finalUrl: string;
  status: string;
  statusCode: number;
  statusText: string;
  responseTime: number;
  title: string | null;
  description: string | null;
  contentLength: number;
  https: boolean;
  cached: boolean;
}

export interface AuditFailureData {
  id: string;
  status: string;
  error: string;
  cached: boolean;
}

export type AuditResponseData = AuditSuccessData | AuditFailureData;

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly auditRepository: AuditRepository,
    private readonly urlFetcherService: UrlFetcherService,
    private readonly htmlParserService: HtmlParserService,
    private readonly cacheService: CacheService,
    private readonly configService: AppConfigService,
  ) {}

  private getRequestId(): string {
    return (this.request?.headers?.[REQUEST_ID_HEADER] as string) || 'N/A';
  }

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    const requestId = this.getRequestId();
    const cacheKey = generateCacheKey(dto.url);

    // 1. Check Redis Cache
    const cachedResponse = await this.cacheService.get<ApiResponse<AuditSuccessData>>(cacheKey);

    if (cachedResponse) {
      this.logger.log(`[${requestId}] Cache HIT for key: ${cacheKey}`);
      return {
        ...cachedResponse,
        data: {
          ...cachedResponse.data,
          cached: true,
        },
      };
    }

    this.logger.log(`[${requestId}] Cache MISS for key: ${cacheKey}`);

    // 2. Log Audit Started
    this.logger.log(`[${requestId}] Audit Started - URL: ${dto.url}`);

    // 3. Create DB Record (PENDING)
    const audit = await this.auditRepository.create(dto.url, AuditStatus.PENDING);

    // 4. Log Request Sent
    this.logger.log(`[${requestId}] Request Sent - URL: ${dto.url}`);

    // 5. Execute HTTP Fetch
    const fetchResult = await this.urlFetcherService.fetchUrl(dto.url);
    const elapsedTime = fetchResult.responseTime ?? 0;

    // 6. Handle Timeout specifically -> HTTP 504 + DB persist
    if (!fetchResult.success && fetchResult.failureReason === 'TIMEOUT') {
      this.logger.warn(
        `[${requestId}] Request Timed Out - URL: ${dto.url} - Elapsed: ${elapsedTime}ms`,
      );

      await this.auditRepository.update(audit.id, {
        status: AuditStatus.FAILED,
        errorMessage: 'Request timed out',
        failureReason: 'TIMEOUT',
        responseTime: elapsedTime,
        finalUrl: dto.url,
      });

      this.logger.warn(
        `[${requestId}] Audit Failed - URL: ${dto.url} - Status: FAILED - Reason: TIMEOUT`,
      );

      throw new GatewayTimeoutException({
        success: false,
        statusCode: 504,
        message: 'Audit request timed out.',
        errorCode: 'AUDIT_TIMEOUT',
      });
    }

    // 7. Handle Successful Fetch
    if (fetchResult.success && fetchResult.statusCode !== undefined) {
      const finalUrl = fetchResult.finalUrl ?? dto.url;
      const htmlContent = fetchResult.htmlContent ?? '';

      const metadata = this.htmlParserService.parse(htmlContent, finalUrl);

      const updatedAudit = await this.auditRepository.update(audit.id, {
        status: AuditStatus.COMPLETED,
        statusCode: fetchResult.statusCode,
        statusText: fetchResult.statusText ?? '',
        responseTime: elapsedTime,
        finalUrl,
        title: metadata.title,
        description: metadata.description,
        contentLength: metadata.contentLength,
        https: metadata.https,
      });

      const finalRecord = updatedAudit ?? audit;

      this.logger.log(
        `[${requestId}] Request Completed - URL: ${dto.url} - Status: COMPLETED - Elapsed: ${elapsedTime}ms`,
      );

      const response: ApiResponse<AuditSuccessData> = {
        success: true,
        message: 'Audit completed successfully',
        data: {
          id: finalRecord.id,
          url: finalRecord.url,
          finalUrl: finalRecord.finalUrl ?? finalUrl,
          status: AuditStatus.COMPLETED,
          statusCode: finalRecord.statusCode ?? fetchResult.statusCode,
          statusText: finalRecord.statusText ?? fetchResult.statusText ?? '',
          responseTime: finalRecord.responseTime ?? elapsedTime,
          title: finalRecord.title ?? metadata.title,
          description: finalRecord.description ?? metadata.description,
          contentLength: finalRecord.contentLength ?? metadata.contentLength,
          https: finalRecord.https ?? metadata.https,
          cached: false,
        },
      };

      // Store in Redis Cache
      const ttl = this.configService.cache.ttl;
      await this.cacheService.set(cacheKey, response, ttl);

      return response;
    }

    // 8. Handle non-timeout network failures (DNS, SSL, Refused, Network Unreachable)
    const errorMessage = fetchResult.errorMessage ?? 'Audit execution failed';
    const failureReason = fetchResult.failureReason ?? 'EXECUTION_FAILED';

    await this.auditRepository.update(audit.id, {
      status: AuditStatus.FAILED,
      errorMessage,
      failureReason,
      responseTime: elapsedTime,
      finalUrl: fetchResult.finalUrl ?? dto.url,
    });

    this.logger.warn(
      `[${requestId}] Audit Failed - URL: ${dto.url} - Status: FAILED - Reason: ${failureReason}`,
    );

    return {
      success: false,
      message: 'Audit failed',
      data: {
        id: audit.id,
        status: AuditStatus.FAILED,
        error: errorMessage,
        cached: false,
      },
    };
  }
}
