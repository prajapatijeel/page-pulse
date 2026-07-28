export type Environment = 'development' | 'production' | 'test' | 'staging';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface AppConfig {
  port: number;
  nodeEnv: Environment;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
}

export interface CacheConfig {
  ttl: number;
}

export interface HttpConfig {
  timeout: number;
  maxConcurrentRequests: number;
}

export interface AuditQueueConfig {
  maxConcurrent: number;
  maxQueue: number;
}

export interface RateLimitConfig {
  limit: number;
  ttl: number;
}

export interface LogConfig {
  level: LogLevel;
}

export interface AppConfiguration {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  cache: CacheConfig;
  http: HttpConfig;
  auditQueue: AuditQueueConfig;
  rateLimit: RateLimitConfig;
  log: LogConfig;
}
