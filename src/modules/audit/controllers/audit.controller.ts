/**
 * ============================================================
 * Audit Controller
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the HTTP route handler for audit endpoints. It is the
 * thinnest possible layer — its only job is to:
 *   1. Declare the HTTP method and route.
 *   2. Accept the validated request body (DTO).
 *   3. Delegate to the service.
 *   4. Return the service response with the correct HTTP status code.
 *
 * ZERO BUSINESS LOGIC lives here. If you see an `if` statement,
 * a database call, or a try/catch in a controller, something is wrong.
 *
 * RESPONSIBILITY:
 * - POST /api/v1/audit → AuditService.createAudit() → 201 Created
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/controllers/ — the HTTP sublayer of the
 * audit vertical slice. NestJS routes incoming requests to these methods
 * based on decorators.
 *
 * SWAGGER ANNOTATIONS:
 * Every endpoint is documented with @ApiTags, @ApiOperation, @ApiBody,
 * and @ApiResponse so the Swagger UI at /api/docs is always accurate.
 *
 * FUTURE PREPARATION:
 * - GET /api/v1/audit/:id (retrieve single audit)
 * - GET /api/v1/audit (list all audits with pagination)
 * - DELETE /api/v1/audit/:id (remove audit record)
 * - All added to this controller, each as a one-liner delegating to the service.
 * ============================================================
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service.js';
import { CreateAuditDto } from '../dto/create-audit.dto.js';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new URL audit',
    description: 'Accepts a URL and creates a new audit record with PENDING status.',
  })
  @ApiBody({ type: CreateAuditDto })
  @ApiResponse({ status: 201, description: 'Audit request accepted and record created.' })
  @ApiResponse({ status: 400, description: 'Validation failed — invalid or missing URL.' })
  async createAudit(@Body() dto: CreateAuditDto) {
    return this.auditService.createAudit(dto);
  }
}
