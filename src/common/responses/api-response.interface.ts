/**
 * ============================================================
 * API Response Interface
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Every endpoint in Page Pulse returns JSON with the same shape.
 * Instead of ad-hoc objects scattered across controllers and services,
 * this interface enforces a universal contract:
 *
 *   { success: boolean, message: string, data: T }
 *
 * Frontend consumers parse ONE structure. Error handlers wrap ONE structure.
 * Serialization middleware targets ONE structure.
 *
 * RESPONSIBILITY:
 * - Define the generic ApiResponse<T> interface.
 * - Consumed by every service method return type.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/common/responses/ because it is framework-level infrastructure
 * shared across ALL feature modules — not owned by any single domain.
 *
 * FUTURE PREPARATION:
 * - Paginated responses will extend this with { meta: { page, limit, total } }.
 * - Batch responses will use ApiResponse<T[]>.
 * - WebSocket event payloads will reuse this shape for consistency.
 * ============================================================
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
