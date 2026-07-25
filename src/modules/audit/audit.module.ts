/**
 * ============================================================
 * Audit Module
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the NestJS module registration for the audit feature.
 * It wires together every layer of the audit vertical slice:
 *   - SequelizeModule.forFeature([Audit]) → registers the model with the ORM.
 *   - controllers: [AuditController] → exposes HTTP routes.
 *   - providers: [AuditService, AuditRepository] → makes them injectable.
 *
 * RESPONSIBILITY:
 * - Declare all audit-specific dependencies in one place.
 * - Imported by AppModule to activate the entire feature.
 *
 * ARCHITECTURE PLACEMENT:
 * Root of src/modules/audit/ — the module boundary file that NestJS
 * uses to understand what this feature slice provides and consumes.
 *
 * FUTURE PREPARATION:
 * - Additional providers (AuditFetcher, AuditParser) will be added here.
 * - Exports array will expose AuditService to other modules if needed.
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Audit } from './models/audit.model.js';
import { AuditController } from './controllers/audit.controller.js';
import { AuditService } from './services/audit.service.js';
import { AuditRepository } from './repositories/audit.repository.js';

@Module({
  imports: [SequelizeModule.forFeature([Audit])],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
})
export class AuditModule {}
