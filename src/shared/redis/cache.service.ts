/**
 * ============================================================
 * Cache Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * High-level caching service abstracting raw Redis commands.
 * Handles serialization/deserialization, TTL enforcement, and structured event logging.
 *
 * RESPONSIBILITY:
 * - `get<T>(key)`: Fetch and parse JSON cached object. Logs `Cache HIT` or `Cache MISS`.
 * - `set<T>(key, value, ttl)`: Stringify and persist object in Redis with TTL. Logs `Cache SET`.
 * - `delete(key)` / `del(key)`: Invalidate cache key. Logs `Cache DELETE`.
 * - `exists(key)`: Check key presence in Redis.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/shared/redis/ — consumed by domain services (`AuditService`).
 * ============================================================
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType) {}

  /**
   * Retrieve a cached value by key.
   * Logs "Cache HIT" or "Cache MISS".
   * Returns null on miss or if Redis is disconnected.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected()) {
        this.logger.debug(`Cache MISS for key: ${key} (Redis client offline)`);
        return null;
      }

      const raw = await this.redisClient.get(key);
      if (!raw) {
        this.logger.log(`Cache MISS for key: ${key}`);
        return null;
      }

      this.logger.log(`Cache HIT for key: ${key}`);
      return JSON.parse(raw) as T;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache GET error for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Store a value in cache with a TTL (time-to-live) in seconds.
   * Logs "Cache SET".
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      if (!this.isConnected()) {
        return;
      }

      const serialized = JSON.stringify(value);
      await this.redisClient.setEx(key, ttlSeconds, serialized);
      this.logger.log(`Cache SET for key: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache SET error for key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete a cached entry by key.
   * Logs "Cache DELETE".
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected()) {
        return;
      }

      await this.redisClient.del(key);
      this.logger.log(`Cache DELETE for key: ${key}`);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache DELETE error for key "${key}": ${err.message}`);
    }
  }

  /**
   * Alias for delete(key).
   */
  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  /**
   * Check if a key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        return false;
      }

      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache EXISTS error for key "${key}": ${err.message}`);
      return false;
    }
  }

  /**
   * Check if Redis client is connected and open.
   */
  private isConnected(): boolean {
    return this.redisClient?.isOpen ?? false;
  }
}
