import { Test, TestingModule } from '@nestjs/testing';
import { GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuditService, AuditSuccessData } from './audit.service';
import { AuditRepository } from '../repositories/audit.repository';
import { UrlFetcherService } from './url-fetcher.service';
import { HtmlParserService } from './html-parser.service';
import { AuditQueueService } from './audit-queue.service';
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
  let mockAuditQueueService: { enqueue: jest.Mock; size: number; pending: number };
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

    mockAuditQueueService = {
      enqueue: jest.fn().mockImplementation(async (taskFn: () => Promise<unknown>) => {
        return taskFn();
      }),
      size: 0,
      pending: 1,
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockConfigService = {
      cache: { ttl: 60 },
      http: { timeout: 10000, maxConcurrentRequests: 100 },
      auditQueue: { maxConcurrent: 5, maxQueue: 100 },
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
        { provide: AuditQueueService, useValue: mockAuditQueueService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = await module.resolve<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────
  // Cache Hit — Queue Bypass
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Cache Hit (Queue Bypass)', () => {
    it('should return cached response immediately without entering the queue, calling Axios, or writing to the database', async () => {
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
      expect(mockAuditQueueService.enqueue).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).not.toHaveBeenCalled();
      expect(mockUrlFetcherService.fetchUrl).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Single Audit — Cache Miss → Queue → Execute
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Single Audit (Cache Miss)', () => {
    it('should enqueue, create DB record, fetch URL, parse HTML, update DB as COMPLETED, and store in cache', async () => {
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

      // Must go through queue
      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(1);
      expect(mockAuditQueueService.enqueue).toHaveBeenCalledWith(expect.any(Function), {
        requestId: 'test-req-123',
        url: 'https://example.com',
      });

      // DB record created INSIDE the queue task
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

  // ──────────────────────────────────────────────────────────
  // Multiple Simultaneous Audits — Concurrency Control
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Five Simultaneous Audits', () => {
    it('should enqueue all five audits through the queue service', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockUrlFetcherService.fetchUrl.mockResolvedValue({
        success: true,
        statusCode: 200,
        statusText: 'OK',
        responseTime: 100,
        finalUrl: 'https://example.com/',
        htmlContent: '<html><title>Example</title></html>',
      });

      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
        'https://example4.com',
        'https://example5.com',
      ];

      const results = await Promise.all(urls.map((url) => service.createAudit({ url })));

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(AuditStatus.COMPLETED);
      });

      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(5);
      expect(mockAuditRepository.create).toHaveBeenCalledTimes(5);
      expect(mockUrlFetcherService.fetchUrl).toHaveBeenCalledTimes(5);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Queue Overflow — HTTP 503
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Queue Overflow (HTTP 503)', () => {
    it('should throw ServiceUnavailableException when AuditQueueService reports queue full', async () => {
      mockCacheService.get.mockResolvedValue(null);

      // Simulate queue full by making enqueue throw 503
      mockAuditQueueService.enqueue.mockRejectedValue(
        new ServiceUnavailableException({
          success: false,
          statusCode: 503,
          message: 'Audit service is currently busy. Please try again later.',
          errorCode: 'AUDIT_QUEUE_FULL',
        }),
      );

      await expect(service.createAudit({ url: 'https://example.com' })).rejects.toThrow(
        ServiceUnavailableException,
      );

      // Cache was checked first
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
      // Enqueue was attempted
      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(1);
      // No DB record since queue rejected before execution
      expect(mockAuditRepository.create).not.toHaveBeenCalled();
      expect(mockUrlFetcherService.fetchUrl).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Request Timeout — HTTP 504
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Request Timeout (HTTP 504)', () => {
    it('should update DB record as FAILED with TIMEOUT and throw GatewayTimeoutException', async () => {
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

      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(1);
      expect(mockAuditRepository.create).toHaveBeenCalledTimes(1);
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

  // ──────────────────────────────────────────────────────────
  // Network Error — DNS Failure
  // ──────────────────────────────────────────────────────────
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
      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(1);
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

  // ──────────────────────────────────────────────────────────
  // Failed Audit — Slot Release Verification
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Failed Audit Releases Queue Slot', () => {
    it('should release concurrency slot after failure, allowing next queued request to proceed', async () => {
      mockCacheService.get.mockResolvedValue(null);

      // First call fails with timeout (throws → releases slot)
      mockUrlFetcherService.fetchUrl
        .mockResolvedValueOnce({
          success: false,
          responseTime: 10005,
          finalUrl: 'https://slow-site.com',
          errorMessage: 'Request timed out',
          failureReason: 'TIMEOUT',
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          success: true,
          statusCode: 200,
          statusText: 'OK',
          responseTime: 100,
          finalUrl: 'https://fast-site.com/',
          htmlContent: '<html><title>Fast</title></html>',
        });

      // First audit fails
      await expect(service.createAudit({ url: 'https://slow-site.com' })).rejects.toThrow(
        GatewayTimeoutException,
      );

      // Second audit succeeds (slot was released)
      const result = await service.createAudit({ url: 'https://fast-site.com' });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(AuditStatus.COMPLETED);

      // Both went through the queue
      expect(mockAuditQueueService.enqueue).toHaveBeenCalledTimes(2);
      // Both created DB records
      expect(mockAuditRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Deferred DB Record — No Record Until Slot Acquired
  // ──────────────────────────────────────────────────────────
  describe('createAudit - Deferred DB Record Creation', () => {
    it('should NOT create a DB record if the queue rejects the request (503)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAuditQueueService.enqueue.mockRejectedValue(
        new ServiceUnavailableException({
          success: false,
          statusCode: 503,
          message: 'Audit service is currently busy. Please try again later.',
          errorCode: 'AUDIT_QUEUE_FULL',
        }),
      );

      await expect(service.createAudit({ url: 'https://example.com' })).rejects.toThrow(
        ServiceUnavailableException,
      );

      // DB record is never created since queue rejected before execution
      expect(mockAuditRepository.create).not.toHaveBeenCalled();
      expect(mockAuditRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('createAudit - Additional Network Failures', () => {
    const failures: Array<[string, string, string]> = [
      ['HTTP error', 'HTTP_ERROR', 'Target returned HTTP 500'],
      ['invalid SSL certificate', 'SSL_ERROR', 'Invalid SSL certificate'],
    ];

    it.each(failures)(
      'persists %s failures without caching the audit result',
      async (_scenario: string, reason: string, message: string) => {
        mockCacheService.get.mockResolvedValue(null);
        mockUrlFetcherService.fetchUrl.mockResolvedValue({
          success: false,
          responseTime: 20,
          finalUrl: 'https://example.com',
          errorMessage: message,
          failureReason: reason,
        });

        const result = await service.createAudit({ url: 'https://example.com' });

        expect(result.success).toBe(false);
        expect(result.data).toEqual(expect.objectContaining({ error: message, cached: false }));
        expect(mockAuditRepository.update).toHaveBeenCalledWith(
          'test-audit-uuid-123',
          expect.objectContaining({ failureReason: reason, errorMessage: message }),
        );
        expect(mockCacheService.set).not.toHaveBeenCalled();
      },
    );
  });
});
