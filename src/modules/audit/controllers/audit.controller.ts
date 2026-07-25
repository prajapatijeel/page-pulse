/**
 * ============================================================
 * Audit Controller
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Thin HTTP route handler for URL audit endpoints. Accepts request payloads,
 * delegates to `AuditService`, and returns structured API responses.
 *
 * RESPONSIBILITY:
 * - POST /api/v1/audit → AuditService.createAudit() → 201 Created / 400 Bad Request
 * - Expose Swagger documentation annotations.
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
    summary: 'Audit a URL',
    description:
      'Fetches the specified URL, measures latency, follows redirects, parses HTML metadata (title, description, content length, HTTPS), and persists audit metrics.',
  })
  @ApiBody({ type: CreateAuditDto })
  @ApiResponse({
    status: 201,
    description: 'Audit completed or failed successfully with execution metadata.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed — invalid or missing URL.' })
  async createAudit(@Body() dto: CreateAuditDto) {
    return this.auditService.createAudit(dto);
  }
}
