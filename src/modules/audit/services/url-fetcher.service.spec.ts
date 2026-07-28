import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '@config/app-config.service';
import { UrlFetcherService } from './url-fetcher.service';

describe('UrlFetcherService', () => {
  let service: UrlFetcherService;
  let httpService: { get: jest.Mock };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    service = new UrlFetcherService(
      httpService as unknown as HttpService,
      {
        http: { timeout: 1000, maxConcurrentRequests: 1 },
      } as AppConfigService,
    );
  });

  it('returns a successful HTTP response without contacting a real website', async () => {
    httpService.get.mockReturnValue(
      of({
        status: 200,
        statusText: 'OK',
        data: '<html><title>Example</title></html>',
        request: { res: { responseUrl: 'https://example.com/final' } },
      }),
    );

    await expect(service.fetchUrl('https://example.com')).resolves.toEqual(
      expect.objectContaining({
        success: true,
        statusCode: 200,
        finalUrl: 'https://example.com/final',
      }),
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ timeout: 1000 }),
    );
  });

  it.each([
    ['HTTP error response', undefined, 'HTTP request failed'],
    ['DNS failure', 'ENOTFOUND', 'DNS resolution failed'],
    ['invalid SSL certificate', 'CERT_HAS_EXPIRED', 'Invalid SSL certificate'],
  ])('classifies %s without a real network request', async (_scenario, code, expectedMessage) => {
    httpService.get.mockReturnValue(
      throwError(() => ({ code, message: code ? 'request failed' : 'HTTP request failed' })),
    );

    await expect(service.fetchUrl('https://example.com')).resolves.toEqual(
      expect.objectContaining({ success: false, errorMessage: expectedMessage }),
    );
  });
});
