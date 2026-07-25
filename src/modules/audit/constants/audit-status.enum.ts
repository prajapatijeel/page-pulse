/**
 * ============================================================
 * Audit Status Enum
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * The audit lifecycle transitions through discrete states:
 *   PENDING → COMPLETED (webpage fetch succeeded and metadata recorded)
 *   PENDING → FAILED    (fetch failed due to network, DNS, SSL, or timeout error)
 *
 * RESPONSIBILITY:
 * - Define all valid audit lifecycle statuses for PostgreSQL database storage.
 * - Enforce status type safety across model, service, repository, and DTO layers.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives inside src/modules/audit/constants/ as domain-specific constants.
 * ============================================================
 */

export enum AuditStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
