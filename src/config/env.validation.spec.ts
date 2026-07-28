import 'reflect-metadata';
import { validate } from './env.validation';

describe('Environment Validation', () => {
  it('should validate a valid configuration object', () => {
    const validEnv = {
      PORT: '3000',
      NODE_ENV: 'development',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_NAME: 'page_pulse_db',
      DATABASE_USER: 'postgres',
      DATABASE_PASSWORD: 'postgres',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      CACHE_TTL: '60',
      REQUEST_TIMEOUT: '5000',
      MAX_CONCURRENT_REQUESTS: '100',
      RATE_LIMIT_LIMIT: '100',
      RATE_LIMIT_TTL: '60',
      LOG_LEVEL: 'info',
    };

    const result = validate(validEnv);
    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.DATABASE_PORT).toBe(5432);
  });

  it('should throw an error if PORT is invalid', () => {
    const invalidEnv = {
      PORT: 'invalid_port',
      NODE_ENV: 'development',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_NAME: 'page_pulse_db',
      DATABASE_USER: 'postgres',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
    };

    expect(() => validate(invalidEnv)).toThrow(/Environment Validation Failed/);
  });

  it('should throw an error if NODE_ENV is not an allowed enum value', () => {
    const invalidEnv = {
      PORT: '3000',
      NODE_ENV: 'invalid_env',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432',
      DATABASE_NAME: 'page_pulse_db',
      DATABASE_USER: 'postgres',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
    };

    expect(() => validate(invalidEnv)).toThrow(/NODE_ENV must be one of/);
  });

  it('should accept managed PostgreSQL and Redis connection URLs', () => {
    const result = validate({
      DATABASE_URL: 'postgresql://user:password@db.example.com:5432/page_pulse',
      REDIS_URL: 'redis://default:password@redis.example.com:6379',
    });

    expect(result.DATABASE_URL).toContain('db.example.com');
    expect(result.REDIS_URL).toContain('redis.example.com');
  });
});
