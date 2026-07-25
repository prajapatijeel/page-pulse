/**
 * ============================================================
 * Audit Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Business domain orchestrator for URL audits.
 *
 * SERVICE FLOW (with Redis Caching):
 * 1. Normalize the URL and generate a cache key.
 * 2. Check Redis for a cached response.
 *    - CACHE HIT: Return cached response immediately with `cached: true`.
 *    - CACHE MISS: Continue to step 3.
 * 3. Create initial audit record in DB (status = PENDING).
 * 4. Execute HTTP fetch via `UrlFetcherService`.
 * 5. If fetch succeeds, parse HTML metadata via `HtmlParserService`.
 * 6. Update audit record in DB (status = COMPLETED).
 * 7. Store the successful response in Redis cache with configurable TTL.
 * 8. Return response with `cached: false`.
 * 9. If fetch fails, update DB (status = FAILED). Do NOT cache failed audits.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — injected into `AuditController`.
 *
 * DESIGN DECISIONS:
 * - AuditService never touches Redis directly — uses `CacheService` abstraction.
 * - Only COMPLETED audits are cached. FAILED audits are always re-attempted.
 * - TTL is read from `AppConfigService.cache.ttl` (env: CACHE_TTL).
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ApiResponse } from '@common/responses/api-response.interface.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { UrlFetcherService } from './url-fetcher.service';
import { HtmlParserService } from './html-parser.service';
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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly urlFetcherService: UrlFetcherService,
    private readonly htmlParserService: HtmlParserService,
    private readonly cacheService: CacheService,
    private readonly configService: AppConfigService,
  ) {}

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    // 1. Generate cache key from normalized URL
    const cacheKey = generateCacheKey(dto.url);

    // 2. Check Redis for cached response
    const cachedResponse = await this.cacheService.get<ApiResponse<AuditSuccessData>>(cacheKey);

    if (cachedResponse) {
      this.logger.debug(`Cache HIT for key: ${cacheKey}`);
      // Mark as cached and return immediately
      return {
        ...cachedResponse,
        data: {
          ...cachedResponse.data,
          cached: true,
        },
      };
    }

    this.logger.debug(`Cache MISS for key: ${cacheKey}`);

    // 3. Create initial audit record (PENDING)
    const audit = await this.auditRepository.create(dto.url, AuditStatus.PENDING);

    // 4. Execute HTTP fetch
    const fetchResult = await this.urlFetcherService.fetchUrl(dto.url);

    // 5. Handle successful fetch
    if (fetchResult.success && fetchResult.statusCode !== undefined) {
      const finalUrl = fetchResult.finalUrl ?? dto.url;
      const htmlContent = fetchResult.htmlContent ?? '';

      // Parse HTML metadata
      const metadata = this.htmlParserService.parse(htmlContent, finalUrl);

      const updatedAudit = await this.auditRepository.update(audit.id, {
        status: AuditStatus.COMPLETED,
        statusCode: fetchResult.statusCode,
        statusText: fetchResult.statusText ?? '',
        responseTime: fetchResult.responseTime ?? 0,
        finalUrl,
        title: metadata.title,
        description: metadata.description,
        contentLength: metadata.contentLength,
        https: metadata.https,
      });

      const finalRecord = updatedAudit ?? audit;

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
          responseTime: finalRecord.responseTime ?? fetchResult.responseTime ?? 0,
          title: finalRecord.title ?? metadata.title,
          description: finalRecord.description ?? metadata.description,
          contentLength: finalRecord.contentLength ?? metadata.contentLength,
          https: finalRecord.https ?? metadata.https,
          cached: false,
        },
      };

      // 6. Cache the successful response (TTL from env)
      const ttl = this.configService.cache.ttl;
      await this.cacheService.set(cacheKey, response, ttl);

      return response;
    }

    // 7. Handle failed fetch — do NOT cache failures
    const errorMessage = fetchResult.errorMessage ?? 'Audit execution failed';
    const failureReason = fetchResult.failureReason ?? 'EXECUTION_FAILED';

    const updatedAudit = await this.auditRepository.update(audit.id, {
      status: AuditStatus.FAILED,
      errorMessage,
      failureReason,
      responseTime: fetchResult.responseTime ?? 0,
      finalUrl: fetchResult.finalUrl ?? dto.url,
    });

    const finalRecord = updatedAudit ?? audit;

    return {
      success: false,
      message: 'Audit failed',
      data: {
        id: finalRecord.id,
        status: AuditStatus.FAILED,
        error: finalRecord.errorMessage ?? errorMessage,
        cached: false,
      },
    };
  }
}
