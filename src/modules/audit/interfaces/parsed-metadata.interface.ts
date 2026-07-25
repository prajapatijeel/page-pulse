/**
 * ============================================================
 * Parsed Metadata Interface
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Contract returned by `HtmlParserService`. Defines the structure of HTML metadata
 * extracted from a webpage document.
 *
 * RESPONSIBILITY:
 * - Define strongly-typed metadata properties: `title`, `description`, `contentLength`, `https`.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/interfaces/ as a domain interface.
 * ============================================================
 */

export interface ParsedMetadata {
  title: string | null;
  description: string | null;
  contentLength: number;
  https: boolean;
}
