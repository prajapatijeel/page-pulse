/**
 * ============================================================
 * Audit Sequelize Model
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the ORM representation of the `audits` PostgreSQL table.
 * Every row in that table maps 1:1 to an instance of this class.
 * Sequelize uses the decorators below to generate SQL DDL, handle
 * CRUD operations, and enforce data types at the database level.
 *
 * RESPONSIBILITY:
 * - Define the database schema for audit records.
 * - Provide the mapping between TypeScript properties and PostgreSQL columns.
 * - Serve as the single source of truth for the audit table structure.
 *
 * FIELDS (Milestone 1):
 * ┌────────────┬──────────────────┬─────────────────────────────────────┐
 * │ Column     │ Type             │ Constraints                         │
 * ├────────────┼──────────────────┼─────────────────────────────────────┤
 * │ id         │ UUID             │ PK, auto-generated (UUIDV4)         │
 * │ url        │ STRING(2048)     │ NOT NULL                            │
 * │ status     │ ENUM             │ NOT NULL, default: PENDING          │
 * │ createdAt  │ DATE             │ auto-managed by Sequelize           │
 * │ updatedAt  │ DATE             │ auto-managed by Sequelize           │
 * └────────────┴──────────────────┴─────────────────────────────────────┘
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/models/ — the data access layer of the
 * audit vertical slice. The repository consumes this model; the service
 * never imports it directly (it talks through the repository abstraction).
 *
 * FUTURE PREPARATION:
 * - Additional columns (statusCode, responseTimeMs, htmlSnapshot,
 *   errorMessage, headers) will be added here in later milestones.
 * - Associations (e.g., BelongsTo User) will be declared here.
 * ============================================================
 */

import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { AuditStatus } from '../constants/audit-status.enum.js';

@Table({
  tableName: 'audits',
  timestamps: true,
  underscored: true,
})
export class Audit extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING(2048),
    allowNull: false,
  })
  declare url: string;

  @Default(AuditStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(AuditStatus)),
    allowNull: false,
  })
  declare status: AuditStatus;
}
