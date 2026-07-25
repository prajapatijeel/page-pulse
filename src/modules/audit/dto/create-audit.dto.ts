/**
 * ============================================================
 * Create Audit DTO (Data Transfer Object)
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * This is the validation contract for the POST /api/v1/audit request body.
 * The global ValidationPipe (configured in main.ts) automatically:
 *   1. Instantiates this class from the raw JSON body.
 *   2. Runs every class-validator decorator against the values.
 *   3. Returns 400 Bad Request with detailed error messages if validation fails.
 *   4. Strips unknown properties (whitelist: true).
 *   5. Rejects unknown properties (forbidNonWhitelisted: true).
 *
 * RESPONSIBILITY:
 * - Validate that `url` is present, non-empty, and a valid URL.
 * - Trim leading/trailing whitespace from the URL.
 * - Provide Swagger schema documentation via @ApiProperty.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/modules/audit/dto/ — the validation layer of the audit
 * vertical slice. Controllers receive validated DTOs; services trust
 * that the data has already been sanitized.
 *
 * FUTURE PREPARATION:
 * - Additional fields (callbackUrl, priority, tags, headers) can be
 *   added here with their own validation decorators.
 * - Nested DTOs (e.g., AuditOptionsDto) can be composed via @ValidateNested.
 * ============================================================
 */

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateAuditDto {
  @ApiProperty({
    description: 'The URL to audit',
    example: 'https://google.com',
  })
  @IsString({ message: 'url must be a string' })
  @IsNotEmpty({ message: 'url must not be empty' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsUrl({}, { message: 'url must be a valid URL' })
  url!: string;
}
