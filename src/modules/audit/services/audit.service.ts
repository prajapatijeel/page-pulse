/**
 * ============================================================
 * Audit Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Business domain orchestrator for URL audits. Coordinates input validation,
 * audit record initialization, HTTP network execution via `UrlFetcherService`,
 * database persistence via `AuditRepository`, and API response formatting.
 *
 * SEPARATION OF CONCERNS:
 * Contains zero network code (delegated to `UrlFetcherService`) and zero SQL queries
 * (delegated to `AuditRepository`). Orchestrates the end-to-end audit lifecycle.
 *
 * RESPONSIBILITY:
 * - `createAudit()`:
 *   1. Create initial DB record with status PENDING.
 *   2. Delegate URL fetching to `UrlFetcherService`.
 *   3. Update database record with status COMPLETED or FAILED and metrics.
 *   4. Return standardized success or failure ApiResponse object.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — injected into `AuditController`.
 *
 * FUTURE PREPARATION:
 * - HTML metadata parsing step will be inserted between fetch and database update in Milestone 3.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import type { ApiResponse } from '@common/responses/api-response.interface.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { UrlFetcherService } from './url-fetcher.service.js';
import { CreateAuditDto } from '../dto/create-audit.dto.js';
import { AuditStatus } from '../constants/audit-status.enum.js';

export interface AuditSuccessData {
  id: string;
  url: string;
  finalUrl: string;
  status: string;
  statusCode: number;
  statusText: string;
  responseTime: number;
}

export interface AuditFailureData {
  id: string;
  status: string;
  error: string;
}

export type AuditResponseData = AuditSuccessData | AuditFailureData;

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly urlFetcherService: UrlFetcherService,
  ) {}

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    // 1. Create initial audit record with status = PENDING
    const audit = await this.auditRepository.create(dto.url, AuditStatus.PENDING);

    // 2. Execute HTTP fetch
    const fetchResult = await this.urlFetcherService.fetchUrl(dto.url);

    // 3. Handle successful fetch (HTTP response received)
    if (fetchResult.success && fetchResult.statusCode !== undefined) {
      const updatedAudit = await this.auditRepository.update(audit.id, {
        status: AuditStatus.COMPLETED,
        statusCode: fetchResult.statusCode,
        statusText: fetchResult.statusText ?? '',
        responseTime: fetchResult.responseTime ?? 0,
        finalUrl: fetchResult.finalUrl ?? dto.url,
      });

      const finalRecord = updatedAudit ?? audit;

      return {
        success: true,
        message: 'Audit completed successfully',
        data: {
          id: finalRecord.id,
          url: finalRecord.url,
          finalUrl: finalRecord.finalUrl ?? dto.url,
          status: AuditStatus.COMPLETED,
          statusCode: finalRecord.statusCode ?? fetchResult.statusCode,
          statusText: finalRecord.statusText ?? fetchResult.statusText ?? '',
          responseTime: finalRecord.responseTime ?? fetchResult.responseTime ?? 0,
        },
      };
    }

    // 4. Handle failed fetch (Network fault, timeout, DNS failure, SSL error)
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
      },
    };
  }
}
