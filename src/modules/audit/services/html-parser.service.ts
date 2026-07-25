/**
 * ============================================================
 * HTML Parser Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Encapsulates HTML document parsing and metadata extraction using Cheerio.
 * Decouples DOM parsing logic from HTTP network execution (`UrlFetcherService`)
 * and database orchestration (`AuditService`).
 *
 * SEPARATION OF CONCERNS:
 * - Does NOT make HTTP calls (no Axios).
 * - Does NOT access the database (no Sequelize).
 * - Accepts raw HTML string + final URL and returns a strongly-typed `ParsedMetadata` object.
 *
 * RESPONSIBILITY:
 * - Extract page title (`<title>`). Return `null` if missing.
 * - Extract meta description (`<meta name="description">`). Return `null` if missing.
 * - Calculate `contentLength` using HTML string character count.
 * - Determine `https` status using `finalUrl.toLowerCase().startsWith('https://')`.
 * - Guarantee zero-crash execution via fail-safe try/catch blocks.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — injected into `AuditService`.
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ParsedMetadata } from '../interfaces/parsed-metadata.interface.js';

@Injectable()
export class HtmlParserService {
  private readonly logger = new Logger(HtmlParserService.name);

  parse(htmlContent: string, finalUrl: string): ParsedMetadata {
    const contentLength = htmlContent ? htmlContent.length : 0;
    const isHttps = finalUrl ? finalUrl.toLowerCase().startsWith('https://') : false;

    if (!htmlContent || typeof htmlContent !== 'string') {
      return {
        title: null,
        description: null,
        contentLength: 0,
        https: isHttps,
      };
    }

    try {
      const $ = cheerio.load(htmlContent);

      // 1. Extract Page Title
      const rawTitle = $('title').first().text().trim();
      const title = rawTitle.length > 0 ? rawTitle : null;

      // 2. Extract Meta Description
      const rawDescription =
        $('meta[name="description" i]').attr('content')?.trim() ??
        $('meta[property="og:description" i]').attr('content')?.trim() ??
        null;
      const description = rawDescription && rawDescription.length > 0 ? rawDescription : null;

      return {
        title,
        description,
        contentLength,
        https: isHttps,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Failed to parse HTML document for ${finalUrl}: ${err.message}`);

      return {
        title: null,
        description: null,
        contentLength,
        https: isHttps,
      };
    }
  }
}
