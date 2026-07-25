/**
 * ============================================================
 * URL Fetch Result Interface
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Defines the contract returned by `UrlFetcherService`. Decouples HTTP execution
 * details (Axios headers, sockets, timing mechanics) from the `AuditService` orchestrator.
 *
 * RESPONSIBILITY:
 * - Define structured response object for URL fetch operations.
 * - Contain execution metadata: success boolean, HTTP status, timing, redirected URL,
 *   raw HTML content, and error details.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/interfaces/ as a domain interface.
 *
 * FUTURE PREPARATION:
 * - `htmlContent` field will be consumed by the HTML Parser Service in Milestone 3.
 * ============================================================
 */

export interface UrlFetchResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  responseTime?: number; // Latency in milliseconds
  finalUrl?: string;
  htmlContent?: string;
  errorMessage?: string;
  failureReason?: string;
}
