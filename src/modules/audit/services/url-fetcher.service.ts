/**
 * ============================================================
 * URL Fetcher Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Encapsulates all HTTP network execution, latency measurement, redirect following,
 * and error handling for URL auditing.
 *
 * SEPARATION OF CONCERNS:
 * No database code, no controller code, no business domain logic lives here.
 * This service has ONE job: take a URL, fetch it over HTTP/HTTPS, measure execution metrics,
 * handle network faults, and return a structured `UrlFetchResult`.
 *
 * RESPONSIBILITY:
 * - Execute HTTP GET request using HttpService (Axios).
 * - Measure latency in milliseconds using `performance.now()`.
 * - Follow up to 5 redirects and capture `finalUrl`.
 * - Set `validateStatus: () => true` so HTTP 4xx/5xx responses are captured cleanly.
 * - Map network failures (timeouts, DNS lookup errors, SSL failures, ECONNREFUSED)
 *   to application-level failure reasons.
 * - Return raw HTML payload for future parsing.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/services/ — injected into `AuditService`.
 *
 * FUTURE PREPARATION:
 * - Will pass `htmlContent` to HTML metadata & SEO parser services in Milestone 3.
 * ============================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { AppConfigService } from '@config/app-config.service';
import { UrlFetchResult } from '../interfaces/url-fetch-result.interface.js';

@Injectable()
export class UrlFetcherService {
  private readonly logger = new Logger(UrlFetcherService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: AppConfigService,
  ) {}

  async fetchUrl(targetUrl: string): Promise<UrlFetchResult> {
    const timeout = this.configService.http.timeout;
    const startTime = performance.now();

    try {
      const response: AxiosResponse<string> = await firstValueFrom(
        this.httpService.get<string>(targetUrl, {
          timeout,
          maxRedirects: 5,
          validateStatus: () => true, // Accept all HTTP status codes (2xx, 3xx, 4xx, 5xx)
          headers: {
            'User-Agent': 'PagePulse-AuditBot/1.0 (+https://pagepulse.io)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          responseType: 'text',
        }),
      );

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Extract final URL after redirects if available
      const finalUrl =
        (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl ?? targetUrl;

      return {
        success: true,
        statusCode: response.status,
        statusText: response.statusText,
        responseTime,
        finalUrl,
        htmlContent: typeof response.data === 'string' ? response.data : '',
      };
    } catch (error: unknown) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      return this.handleFetchError(error, targetUrl, responseTime);
    }
  }

  private handleFetchError(
    error: unknown,
    targetUrl: string,
    responseTime: number,
  ): UrlFetchResult {
    const axiosError = error as AxiosError;
    const code = axiosError.code;
    const message = axiosError.message ?? 'Unknown network error';

    let errorMessage = 'Network error occurred';
    let failureReason = 'NETWORK_ERROR';

    if (
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      message.toLowerCase().includes('timeout')
    ) {
      errorMessage = 'Connection timeout';
      failureReason = 'TIMEOUT';
    } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      errorMessage = 'DNS resolution failed';
      failureReason = 'DNS_FAILURE';
    } else if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'EHOSTUNREACH') {
      errorMessage = 'Connection refused by server';
      failureReason = 'CONNECTION_REFUSED';
    } else if (
      code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
      code === 'CERT_HAS_EXPIRED' ||
      code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
      message.toLowerCase().includes('ssl') ||
      message.toLowerCase().includes('certificate')
    ) {
      errorMessage = 'SSL certificate error';
      failureReason = 'SSL_ERROR';
    } else {
      errorMessage = message;
      failureReason = code ?? 'UNKNOWN_ERROR';
    }

    this.logger.warn(`Failed to fetch URL ${targetUrl}: ${errorMessage} (${failureReason})`);

    return {
      success: false,
      responseTime,
      finalUrl: targetUrl,
      errorMessage,
      failureReason,
    };
  }
}
