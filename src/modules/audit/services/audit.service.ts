/**
 * ============================================================
 * Audit Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the business logic orchestrator for audit operations.
 * It coordinates the flow between validated input (DTOs), data
 * persistence (repository), and structured output (API responses).
 *
 * The controller delegates to this service. The service delegates
 * to the repository. Neither layer reaches across the other's boundary.
 *
 * RESPONSIBILITY:
 * - createAudit(): Accept a validated DTO, persist an audit record
 *   with PENDING status via the repository, and return a structured
 *   ApiResponse with the created record data.
 *
 * WHAT THIS SERVICE DOES NOT DO (Milestone 1):
 * - Does NOT fetch the website (future milestone).
 * - Does NOT parse HTML (future milestone).
 * - Does NOT interact with Redis cache (future milestone).
 * - Does NOT enforce rate limits (future milestone).
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — the business logic sublayer
 * of the audit vertical slice. Injected into the controller via DI.
 *
 * FUTURE PREPARATION:
 * - The fetch-and-parse pipeline (Axios HTTP call, HTML parsing,
 *   status transition PENDING → SUCCESS/FAILED) will be added here.
 * - The controller never changes when new business logic is added.
 * - Additional service methods (getAuditById, getAllAudits, retryAudit)
 *   will be added here as endpoints grow.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import type { ApiResponse } from '@common/responses/api-response.interface.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { CreateAuditDto } from '../dto/create-audit.dto.js';

export interface AuditResponseData {
  id: string;
  url: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async createAudit(dto: CreateAuditDto): Promise<ApiResponse<AuditResponseData>> {
    const audit = await this.auditRepository.create(dto.url);

    return {
      success: true,
      message: 'Audit request accepted',
      data: {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        createdAt: audit.createdAt as Date,
      },
    };
  }
}
