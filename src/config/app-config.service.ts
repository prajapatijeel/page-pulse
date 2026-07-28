import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditQueueConfig,
  CacheConfig,
  DatabaseConfig,
  Environment,
  HttpConfig,
  LogConfig,
  RateLimitConfig,
  RedisConfig,
} from './app-config.interface';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.getOrThrow<number>('appConfig.app.port');
  }

  get nodeEnv(): Environment {
    return this.configService.getOrThrow<Environment>('appConfig.app.nodeEnv');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get isStaging(): boolean {
    return this.nodeEnv === 'staging';
  }

  get database(): DatabaseConfig {
    return this.configService.getOrThrow<DatabaseConfig>('appConfig.database');
  }

  get redis(): RedisConfig {
    return this.configService.getOrThrow<RedisConfig>('appConfig.redis');
  }

  get cache(): CacheConfig {
    return this.configService.getOrThrow<CacheConfig>('appConfig.cache');
  }

  get http(): HttpConfig {
    return this.configService.getOrThrow<HttpConfig>('appConfig.http');
  }

  get auditQueue(): AuditQueueConfig {
    return this.configService.getOrThrow<AuditQueueConfig>('appConfig.auditQueue');
  }

  get rateLimit(): RateLimitConfig {
    return this.configService.getOrThrow<RateLimitConfig>('appConfig.rateLimit');
  }

  get log(): LogConfig {
    return this.configService.getOrThrow<LogConfig>('appConfig.log');
  }
}
