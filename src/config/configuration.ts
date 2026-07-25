import { registerAs } from '@nestjs/config';
import { AppConfiguration, Environment, LogLevel } from './app-config.interface';

export default registerAs('appConfig', (): AppConfiguration => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV || 'development') as Environment,
  },
  database: {
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
  },
  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '60', 10),
  },
  http: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '5000', 10),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100', 10),
  },
  rateLimit: {
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
  },
  log: {
    level: (process.env.LOG_LEVEL || 'info') as LogLevel,
  },
}));
