/**
 * ============================================================
 * Audit Sequelize Model
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Object-Relational Mapping (ORM) entity representing the `audits` table in PostgreSQL.
 *
 * RESPONSIBILITY:
 * - Define database table schema for audit execution records.
 * - Store request attributes (`id`, `url`, `status`), execution metrics (`statusCode`,
 *   `statusText`, `responseTime`, `finalUrl`, `errorMessage`, `failureReason`), and HTML metadata
 *   (`title`, `description`, `contentLength`, `https`).
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/models/ — used by `AuditRepository`.
 * ============================================================
 */

import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { AuditStatus } from '../constants/audit-status.enum';

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

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare statusCode?: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare statusText?: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare responseTime?: number | null;

  @Column({
    type: DataType.STRING(2048),
    allowNull: true,
  })
  declare finalUrl?: string | null;

  @Column({
    type: DataType.STRING(1024),
    allowNull: true,
  })
  declare title?: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description?: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare contentLength?: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare https?: boolean | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare errorMessage?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare failureReason?: string | null;
}
