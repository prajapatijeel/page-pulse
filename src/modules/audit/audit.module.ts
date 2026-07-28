/**
 * ============================================================
 * Audit Module
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * NestJS feature module wiring together every component of the audit slice:
 * - `SequelizeModule.forFeature([Audit])` for database access.
 * - `HttpModule` for Axios HTTP client integration.
 * - Providers: `AuditService`, `AuditRepository`, `UrlFetcherService`, `HtmlParserService`.
 * - Controller: `AuditController`.
 *
 * RESPONSIBILITY:
 * Encapsulate audit domain dependencies into a clean module unit.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { Audit } from './models/audit.model.js';
import { AuditController } from './controllers/audit.controller.js';
import { AuditService } from './services/audit.service.js';
import { AuditRepository } from './repositories/audit.repository.js';
import { UrlFetcherService } from './services/url-fetcher.service.js';
import { HtmlParserService } from './services/html-parser.service.js';
import { AuditQueueService } from './services/audit-queue.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Audit]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditRepository,
    UrlFetcherService,
    HtmlParserService,
    AuditQueueService,
  ],
  exports: [AuditService, AuditRepository, UrlFetcherService, HtmlParserService, AuditQueueService],
})
export class AuditModule {}
