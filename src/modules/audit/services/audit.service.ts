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
 *    - CACHE HIT: Return cached payload immediately (`cached: true`).
 *      Bypasses queue, network, and DB entirely.
 * 2. Enqueue the audit execution via `AuditQueueService`.
 *    - If the queue is full, AuditQueueService throws HTTP 503.
 *    - The request waits until a concurrency slot becomes available.
 * 3. INSIDE the queued task (after acquiring a worker slot):
 *    a. Create initial database record (`status = PENDING`).
 *    b. Execute HTTP fetch via `UrlFetcherService`.
 *    c. On Successful Fetch:
 *       - Parse HTML metadata via `HtmlParserService`.
 *       - Persist `COMPLETED` audit record in PostgreSQL.
 *       - Store in Redis cache with `CACHE_TTL`.
 *       - Log `Audit Completed`.
 *       - Return 201 Created payload (`cached: false`).
 *    d. On Request Timeout (`failureReason === 'TIMEOUT'`):
 *       - Persist `status = FAILED`, `failureReason = TIMEOUT` in DB.
 *       - Throw NestJS `GatewayTimeoutException` (HTTP 504).
 *    e. On Other Network Failure:
 *       - Persist `status = FAILED` with categorized `failureReason` in DB.
 *       - Return structured error payload (`cached: false`).
 * 4. On any exception, the concurrency slot is automatically released
 *    so remaining queued requests continue processing.
 * ============================================================
 */

import { GatewayTimeoutException, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { REQUEST_ID_HEADER } from '@common/middleware/request-id.middleware';
import type { ApiResponse } from '@common/responses/api-response.interface';
import { AuditRepository } from '../repositories/audit.repository';
import { UrlFetcherService } from './url-fetcher.service';
import { HtmlParserService } from './html-parser.service';
import { AuditQueueService } from './audit-queue.service';
import { CacheService } from '../../../shared/redis/cache.service';
import { AppConfigService } from '@config/app-config.service';
import { CreateAuditDto } from '../dto/create-audit.dto';
import { AuditStatus } from '../constants/audit-status.enum';
import { generateCacheKey } from '../utils/url-normalizer.util';

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
    private readonly auditQueueService: AuditQueueService,
    private readonly cacheService: CacheService,
    private readonly configService: AppConfigService,
  ) {}

  private getRequestId(): string {
    return (
      this.request?.requestId || (this.request?.headers?.[REQUEST_ID_HEADER] as string) || 'N/A'
    );
  }

  private logEvent(
    event: string,
    requestId: string,
    url: string,
    startTime: number,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.log(
      JSON.stringify({
        event,
        requestId,
        url,
        elapsedTime: `${Date.now() - startTime}ms`,
        ...details,
      }),
    );
  }

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    const requestId = this.getRequestId();
    const cacheKey = generateCacheKey(dto.url);
    const startTime = Date.now();

    this.logEvent('Audit Started', requestId, dto.url, startTime);

    // ── 1. Check Redis Cache (BEFORE queue) ──
    const cachedResponse = await this.cacheService.get<ApiResponse<AuditSuccessData>>(cacheKey);

    if (cachedResponse) {
      this.logEvent('Cache HIT', requestId, dto.url, startTime, { cacheKey });
      return {
        ...cachedResponse,
        data: {
          ...cachedResponse.data,
          cached: true,
        },
      };
    }

    this.logEvent('Cache MISS', requestId, dto.url, startTime, { cacheKey });

    // ── 2. Enqueue audit execution ──
    // Cache misses enter the concurrency queue.
    // If queue is full, AuditQueueService throws HTTP 503.
    // DB record creation is DEFERRED until a worker slot is acquired.
    return this.auditQueueService.enqueue<ApiResponse<AuditResponseData>>(
      () => this.executeAudit(dto, requestId, cacheKey, startTime),
      { requestId, url: dto.url },
    );
  }

  /**
   * Core audit execution logic.
   * Runs INSIDE a concurrency slot after being dequeued.
   */
  private async executeAudit(
    dto: CreateAuditDto,
    requestId: string,
    cacheKey: string,
    startTime: number,
  ): Promise<ApiResponse<AuditResponseData>> {
    // ── 3a. Create DB Record (PENDING) — deferred until slot acquired ──
    const audit = await this.auditRepository.create(dto.url, AuditStatus.PENDING);

    // ── 3b. Execute HTTP Fetch ──
    const fetchResult = await this.urlFetcherService.fetchUrl(dto.url);
    const elapsedTime = fetchResult.responseTime ?? 0;

    // ── 3c. Handle Timeout → HTTP 504 + DB persist ──
    if (!fetchResult.success && fetchResult.failureReason === 'TIMEOUT') {
      this.logEvent('Timeout', requestId, dto.url, startTime, {
        fetchElapsedTime: `${elapsedTime}ms`,
      });

      await this.auditRepository.update(audit.id, {
        status: AuditStatus.FAILED,
        errorMessage: 'Request timed out',
        failureReason: 'TIMEOUT',
        responseTime: elapsedTime,
        finalUrl: dto.url,
      });

      this.logEvent('Audit Failed', requestId, dto.url, startTime, {
        status: AuditStatus.FAILED,
        reason: 'TIMEOUT',
      });

      throw new GatewayTimeoutException({
        success: false,
        statusCode: 504,
        message: 'Audit request timed out.',
        errorCode: 'AUDIT_TIMEOUT',
      });
    }

    // ── 3d. Handle Successful Fetch ──
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

      this.logEvent('Audit Completed', requestId, dto.url, startTime, {
        status: AuditStatus.COMPLETED,
        fetchElapsedTime: `${elapsedTime}ms`,
        queueLength: this.auditQueueService.size,
        activeWorkers: this.auditQueueService.pending,
      });

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

    // ── 3e. Handle non-timeout network failures ──
    const errorMessage = fetchResult.errorMessage ?? 'Audit execution failed';
    const failureReason = fetchResult.failureReason ?? 'EXECUTION_FAILED';

    await this.auditRepository.update(audit.id, {
      status: AuditStatus.FAILED,
      errorMessage,
      failureReason,
      responseTime: elapsedTime,
      finalUrl: fetchResult.finalUrl ?? dto.url,
    });

    this.logEvent('Audit Failed', requestId, dto.url, startTime, {
      status: AuditStatus.FAILED,
      reason: failureReason,
      queueLength: this.auditQueueService.size,
      activeWorkers: this.auditQueueService.pending,
    });

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
