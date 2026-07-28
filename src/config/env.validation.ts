import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import type { Environment, LogLevel } from './app-config.interface';

const ENVIRONMENTS: Environment[] = ['development', 'production', 'test', 'staging'];
const LOG_LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

export class EnvironmentVariables {
  @Type(() => Number)
  @IsNumber({}, { message: 'PORT must be a valid number' })
  @Min(1, { message: 'PORT must be at least 1' })
  @Max(65535, { message: 'PORT must not exceed 65535' })
  PORT: number = 3000;

  @IsEnum(ENVIRONMENTS, {
    message: `NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`,
  })
  NODE_ENV: string = 'development';

  @IsOptional()
  @Transform(({ value }: { value: string | undefined }) => value || undefined)
  @IsUrl({ protocols: ['postgres', 'postgresql'], require_protocol: true })
  DATABASE_URL?: string;

  @IsString({ message: 'DATABASE_HOST must be a string' })
  @IsNotEmpty({ message: 'DATABASE_HOST is required' })
  DATABASE_HOST: string = 'localhost';

  @Type(() => Number)
  @IsNumber({}, { message: 'DATABASE_PORT must be a valid number' })
  @Min(1, { message: 'DATABASE_PORT must be at least 1' })
  @Max(65535, { message: 'DATABASE_PORT must not exceed 65535' })
  DATABASE_PORT: number = 5432;

  @IsString({ message: 'DATABASE_NAME must be a string' })
  @IsNotEmpty({ message: 'DATABASE_NAME is required' })
  DATABASE_NAME: string = 'page_pulse_db';

  @IsString({ message: 'DATABASE_USER must be a string' })
  @IsNotEmpty({ message: 'DATABASE_USER is required' })
  DATABASE_USER: string = 'postgres';

  @IsString({ message: 'DATABASE_PASSWORD must be a string' })
  DATABASE_PASSWORD: string = 'postgres';

  @IsOptional()
  @Transform(({ value }: { value: string | undefined }) => value || undefined)
  @IsUrl({ protocols: ['redis', 'rediss'], require_protocol: true })
  REDIS_URL?: string;

  @IsString({ message: 'REDIS_HOST must be a string' })
  @IsNotEmpty({ message: 'REDIS_HOST is required' })
  REDIS_HOST: string = 'localhost';

  @Type(() => Number)
  @IsNumber({}, { message: 'REDIS_PORT must be a valid number' })
  @Min(1, { message: 'REDIS_PORT must be at least 1' })
  @Max(65535, { message: 'REDIS_PORT must not exceed 65535' })
  REDIS_PORT: number = 6379;

  @Type(() => Number)
  @IsNumber({}, { message: 'CACHE_TTL must be a valid number' })
  @Min(0, { message: 'CACHE_TTL cannot be negative' })
  CACHE_TTL: number = 60;

  @Type(() => Number)
  @IsNumber({}, { message: 'REQUEST_TIMEOUT must be a valid number' })
  @Min(0, { message: 'REQUEST_TIMEOUT cannot be negative' })
  REQUEST_TIMEOUT: number = 5000;

  @Type(() => Number)
  @IsNumber({}, { message: 'AUDIT_REQUEST_TIMEOUT must be a valid number' })
  @Min(0, { message: 'AUDIT_REQUEST_TIMEOUT cannot be negative' })
  AUDIT_REQUEST_TIMEOUT: number = 10000;

  @Type(() => Number)
  @IsNumber({}, { message: 'AUDIT_MAX_CONCURRENT must be a valid number' })
  @Min(1, { message: 'AUDIT_MAX_CONCURRENT must be at least 1' })
  AUDIT_MAX_CONCURRENT: number = 5;

  @Type(() => Number)
  @IsNumber({}, { message: 'AUDIT_MAX_QUEUE must be a valid number' })
  @Min(1, { message: 'AUDIT_MAX_QUEUE must be at least 1' })
  AUDIT_MAX_QUEUE: number = 100;

  @Type(() => Number)
  @IsNumber({}, { message: 'MAX_CONCURRENT_REQUESTS must be a valid number' })
  @Min(1, { message: 'MAX_CONCURRENT_REQUESTS must be at least 1' })
  MAX_CONCURRENT_REQUESTS: number = 100;

  @Type(() => Number)
  @IsNumber({}, { message: 'RATE_LIMIT_LIMIT must be a valid number' })
  @Min(1, { message: 'RATE_LIMIT_LIMIT must be at least 1' })
  RATE_LIMIT_LIMIT: number = 100;

  @Type(() => Number)
  @IsNumber({}, { message: 'RATE_LIMIT_TTL must be a valid number' })
  @Min(1, { message: 'RATE_LIMIT_TTL must be at least 1' })
  RATE_LIMIT_TTL: number = 60;

  @IsEnum(LOG_LEVELS, {
    message: `LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`,
  })
  LOG_LEVEL: string = 'info';
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Environment Validation Failed: ${formattedErrors}`);
  }

  return validatedConfig;
}
