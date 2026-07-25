/**
 * ============================================================
 * Audit Status Enum
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * The audit lifecycle transitions through discrete states:
 *   PENDING → SUCCESS (fetch succeeded)
 *   PENDING → FAILED  (fetch failed, timeout, DNS error, etc.)
 *
 * Using an enum instead of raw strings provides:
 * - Compile-time type safety (typos caught before runtime).
 * - IDE autocomplete for every consumer.
 * - A single source of truth for status values stored in PostgreSQL.
 *
 * RESPONSIBILITY:
 * - Define all valid audit lifecycle statuses.
 * - Used by the Sequelize model column definition.
 * - Used by the service layer for status transitions.
 * - Used by the DTO layer for response typing.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives inside src/modules/audit/constants/ because this enum is
 * domain-specific to the audit feature — not a system-wide constant.
 *
 * FUTURE PREPARATION:
 * - Additional statuses (e.g., IN_PROGRESS, TIMEOUT, RATE_LIMITED)
 *   can be added here without changing any existing consumer logic.
 * - The PostgreSQL column stores these as string enum values, so
 *   adding a new member is a non-breaking schema change.
 * ============================================================
 */

export enum AuditStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
