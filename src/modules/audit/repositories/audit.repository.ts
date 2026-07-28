/**
 * ============================================================
 * Audit Repository
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Data access layer for audit records. Encapsulates all Sequelize ORM operations.
 * Isolates SQL/ORM implementation details from the service layer.
 *
 * RESPONSIBILITY:
 * - `create()`: Persist a new audit record (initial PENDING state).
 * - `update()`: Update audit record status, HTTP metrics, or error fields after execution.
 * - `findById()`: Retrieve an audit by primary key (UUID).
 * - `findAll()`: Retrieve all audit records ordered by creation timestamp.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/repositories/ — used by `AuditService`.
 *
 * FUTURE PREPARATION:
 * - Query filters, pagination, and transactional updates will be added here.
 * ============================================================
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Audit } from '../models/audit.model';
import { AuditStatus } from '../constants/audit-status.enum';

@Injectable()
export class AuditRepository {
  constructor(
    @InjectModel(Audit)
    private readonly auditModel: typeof Audit,
  ) {}

  async create(url: string, status: AuditStatus = AuditStatus.PENDING): Promise<Audit> {
    return this.auditModel.create({ url, status });
  }

  async update(id: string, updateData: Partial<Audit>): Promise<Audit | null> {
    const audit = await this.auditModel.findByPk(id);
    if (!audit) {
      return null;
    }
    return audit.update(updateData);
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
