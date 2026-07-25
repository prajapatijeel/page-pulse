import { Test, TestingModule } from '@nestjs/testing';
import { GatewayTimeoutException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuditService, AuditSuccessData } from './audit.service';
import { AuditRepository } from '../repositories/audit.repository';
import { UrlFetcherService } from './url-fetcher.service';
import { HtmlParserService } from './html-parser.service';
import { CacheService } from '../../../shared/redis/cache.service';
import { AppConfigService } from '../../../config/app-config.service';
import { AuditStatus } from '../constants/audit-status.enum';
import { Audit } from '../models/audit.model';
import type { ApiResponse } from '@common/responses/api-response.interface';

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditRepository: { create: jest.Mock; update: jest.Mock };
  let mockUrlFetcherService: { fetchUrl: jest.Mock };
  let mockHtmlParserService: { parse: jest.Mock };
  let mockCacheService: { get: jest.Mock; set: jest.Mock };
  let mockConfigService: Partial<AppConfigService>;

  const mockAuditRecord = {
    id: 'test-audit-uuid-123',
    url: 'https://example.com',
    status: AuditStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Audit;

  beforeEach(async () => {
    mockAuditRepository = {
      create: jest.fn().mockResolvedValue(mockAuditRecord),
      update: jest.fn().mockImplementation((id: string, data: Partial<Audit>) =>
        Promise.resolve({
          ...mockAuditRecord,
          ...data,
        } as unknown as Audit),
      ),
    };

    mockUrlFetcherService = {
      fetchUrl: jest.fn(),
    };

    mockHtmlParserService = {
      parse: jest.fn().mockReturnValue({
        title: 'Example Title',
        description: 'Example Description',
        contentLength: 1234,
        https: true,
      }),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockConfigService = {
      cache: { ttl: 60 },
      http: { timeout: 10000, maxConcurrentRequests: 100 },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: REQUEST,
          useValue: { headers: { 'x-request-id': 'test-req-123' } },
        },
        { provide: AuditRepository, useValue: mockAuditRepository },
        { provide: UrlFetcherService, useValue: mockUrlFetcherService },
        { provide: HtmlParserService, useValue: mockHtmlParserService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = await module.resolve<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAudit - Cache Hit', () => {
    it('should return cached response immediately without calling Axios or Database', async () => {
      const cachedData: ApiResponse<AuditSuccessData> = {
        success: true,
        message: 'Audit completed successfully',
        data: {
          id: 'cached-uuid-999',
          url: 'https://example.com',
          finalUrl: 'https://example.com/',
          status: 'COMPLETED',
          statusCode: 200,
          statusText: 'OK',
          responseTime: 150,
          title: 'Cached Title',
          description: 'Cached Desc',
          contentLength: 5000,
          https: true,
          cached: false,
        },
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.createAudit({ url: 'https://example.com' });

      expect(result.data.cached).toBe(true);
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
      expect(mockAuditRepository.create).not.toHaveBeenCalled();
      expect(mockUrlFetcherService.fetchUrl).not.toHaveBeenCalled();
    });
  });

  describe('createAudit - Cache Miss & Successful Fetch', () => {
    it('should fetch URL, parse HTML, update DB as COMPLETED, and store in Cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockUrlFetcherService.fetchUrl.mockResolvedValue({
        success: true,
        statusCode: 200,
        statusText: 'OK',
        responseTime: 250,
        finalUrl: 'https://example.com/',
        htmlContent: '<html><title>Example Title</title></html>',
      });

      const result = await service.createAudit({ url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(AuditStatus.COMPLETED);
      expect(result.data.cached).toBe(false);
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        'https://example.com',
        AuditStatus.PENDING,
      );
      expect(mockUrlFetcherService.fetchUrl).toHaveBeenCalledWith('https://example.com');
      expect(mockHtmlParserService.parse).toHaveBeenCalledWith(
        '<html><title>Example Title</title></html>',
        'https://example.com/',
      );
      expect(mockAuditRepository.update).toHaveBeenCalledWith(
        'test-audit-uuid-123',
        expect.objectContaining({
          status: AuditStatus.COMPLETED,
          statusCode: 200,
        }),
      );
      expect(mockCacheService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('createAudit - Request Timeout', () => {
    it('should update DB record as FAILED with TIMEOUT and throw GatewayTimeoutException (504)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockUrlFetcherService.fetchUrl.mockResolvedValue({
        success: false,
        responseTime: 10005,
        finalUrl: 'https://example.com',
        errorMessage: 'Request timed out',
        failureReason: 'TIMEOUT',
      });

      await expect(service.createAudit({ url: 'https://example.com' })).rejects.toThrow(
        GatewayTimeoutException,
      );

      expect(mockAuditRepository.update).toHaveBeenCalledWith(
        'test-audit-uuid-123',
        expect.objectContaining({
          status: AuditStatus.FAILED,
          failureReason: 'TIMEOUT',
          errorMessage: 'Request timed out',
        }),
      );
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('createAudit - Network Error (DNS Failure)', () => {
    it('should update DB record as FAILED with DNS_FAILURE and return failed result without caching', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockUrlFetcherService.fetchUrl.mockResolvedValue({
        success: false,
        responseTime: 45,
        finalUrl: 'https://invalid-domain.test',
        errorMessage: 'DNS resolution failed',
        failureReason: 'DNS_FAILURE',
      });

      const result = await service.createAudit({ url: 'https://invalid-domain.test' });

      expect(result.success).toBe(false);
      expect(result.data.status).toBe(AuditStatus.FAILED);
      if ('error' in result.data) {
        expect(result.data.error).toBe('DNS resolution failed');
      }
      expect(mockAuditRepository.update).toHaveBeenCalledWith(
        'test-audit-uuid-123',
        expect.objectContaining({
          status: AuditStatus.FAILED,
          failureReason: 'DNS_FAILURE',
        }),
      );
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });
});
