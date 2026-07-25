/**
 * ============================================================
 * Audit Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Business domain orchestrator for URL audits.
 *
 * SERVICE FLOW:
 * 1. Create initial audit record in DB (status = PENDING).
 * 2. Execute HTTP fetch via `UrlFetcherService`.
 * 3. If fetch succeeds, parse HTML metadata via `HtmlParserService`.
 * 4. Update audit record in DB (status = COMPLETED) with HTTP metrics and parsed metadata.
 * 5. If fetch fails, update audit record in DB (status = FAILED) with error details.
 * 6. Return standardized ApiResponse payload.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — injected into `AuditController`.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import type { ApiResponse } from '@common/responses/api-response.interface.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { UrlFetcherService } from './url-fetcher.service.js';
import { HtmlParserService } from './html-parser.service.js';
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
  title: string | null;
  description: string | null;
  contentLength: number;
  https: boolean;
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
    private readonly htmlParserService: HtmlParserService,
  ) {}

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    // 1. Create initial audit record (PENDING)
    const audit = await this.auditRepository.create(dto.url, AuditStatus.PENDING);

    // 2. Execute HTTP fetch
    const fetchResult = await this.urlFetcherService.fetchUrl(dto.url);

    // 3. Handle successful fetch
    if (fetchResult.success && fetchResult.statusCode !== undefined) {
      const finalUrl = fetchResult.finalUrl ?? dto.url;
      const htmlContent = fetchResult.htmlContent ?? '';

      // Parse HTML metadata using HtmlParserService
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

      return {
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
        },
      };
    }

    // 4. Handle failed fetch
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
