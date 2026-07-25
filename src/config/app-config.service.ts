import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
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
    return this.configService.get<number>('appConfig.app.port', 3000);
  }

  get nodeEnv(): Environment {
    return this.configService.get<Environment>('appConfig.app.nodeEnv', 'development');
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
    return this.configService.get<DatabaseConfig>('appConfig.database', {
      host: 'localhost',
      port: 5432,
      name: 'page_pulse_db',
      user: 'postgres',
      password: 'postgres',
    });
  }

  get redis(): RedisConfig {
    return this.configService.get<RedisConfig>('appConfig.redis', {
      host: 'localhost',
      port: 6379,
    });
  }

  get cache(): CacheConfig {
    return this.configService.get<CacheConfig>('appConfig.cache', {
      ttl: 60,
    });
  }

  get http(): HttpConfig {
    return this.configService.get<HttpConfig>('appConfig.http', {
      timeout: 5000,
      maxConcurrentRequests: 100,
    });
  }

  get rateLimit(): RateLimitConfig {
    return this.configService.get<RateLimitConfig>('appConfig.rateLimit', {
      limit: 100,
      ttl: 60,
    });
  }

  get log(): LogConfig {
    return this.configService.get<LogConfig>('appConfig.log', {
      level: 'info',
    });
  }
}
