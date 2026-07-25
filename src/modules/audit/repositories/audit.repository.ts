/**
 * ============================================================
 * Audit Repository
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the data access layer for audit records. It encapsulates
 * every Sequelize operation behind clean method signatures so the
 * service layer never touches ORM-specific APIs directly.
 *
 * WHY THIS PATTERN MATTERS:
 * If you ever swap Sequelize for Prisma, TypeORM, Drizzle, or raw SQL,
 * you change ONE file (this repository) instead of rewriting every
 * service that queries audit records. The service layer depends on
 * method contracts, not ORM implementation details.
 *
 * RESPONSIBILITY:
 * - create(): Persist a new audit record.
 * - findById(): Retrieve a single audit by UUID.
 * - findAll(): Retrieve all audit records.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/repositories/ — the data access sublayer
 * of the audit vertical slice, sitting between the model (raw ORM) and
 * the service (business logic).
 *
 * FUTURE PREPARATION:
 * - Pagination (findAll with limit/offset/cursor).
 * - Filtering (findByStatus, findByUrl, findByDateRange).
 * - Ordering (sortBy createdAt, status).
 * - Bulk operations (createMany, updateManyStatuses).
 * - Complex joins when associations are added.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Audit } from '../models/audit.model.js';
import { AuditStatus } from '../constants/audit-status.enum.js';

@Injectable()
export class AuditRepository {
  constructor(
    @InjectModel(Audit)
    private readonly auditModel: typeof Audit,
  ) {}

  async create(url: string, status: AuditStatus = AuditStatus.PENDING): Promise<Audit> {
    return this.auditModel.create({ url, status });
  }

  async findById(id: string): Promise<Audit | null> {
    return this.auditModel.findByPk(id);
  }

  async findAll(): Promise<Audit[]> {
    return this.auditModel.findAll({
      order: [['created_at', 'DESC']],
    });
  }
}
