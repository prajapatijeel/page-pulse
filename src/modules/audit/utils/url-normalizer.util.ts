/**
 * ============================================================
 * URL Normalizer Utility
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Ensures consistent cache key generation regardless of URL formatting variations.
 * Without normalization, `https://google.com` and `https://google.com/` would
 * produce different cache keys, causing unnecessary duplicate fetches.
 *
 * RESPONSIBILITY:
 * - Lowercase the hostname.
 * - Ensure trailing slash on bare hostnames.
 * - Strip default ports (80 for HTTP, 443 for HTTPS).
 * - Preserve query strings and path segments.
 *
 * ARCHITECTURE PLACEMENT:
 * Pure utility function — no dependencies, no state, no side effects.
 * Lives in src/modules/audit/utils/ as a domain utility.
 * ============================================================
 */

export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    // Lowercase protocol and hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip default ports
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }

    // Ensure trailing slash on bare hostnames (no path beyond "/")
    if (parsed.pathname === '') {
      parsed.pathname = '/';
    }

    return parsed.toString();
  } catch {
    // If URL cannot be parsed, return as-is (validation layer catches invalid URLs)
    return rawUrl;
  }
}

/**
 * Generate a Redis cache key for a given URL.
 */
export function generateCacheKey(url: string): string {
  return `audit:${normalizeUrl(url)}`;
}
