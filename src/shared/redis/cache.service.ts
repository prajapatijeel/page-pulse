/**
 * ============================================================
 * Cache Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Generic, reusable cache abstraction over the raw Redis client.
 * Decouples all application-level caching logic from direct Redis library calls.
 * AuditService (and any future service) never touches Redis directly.
 *
 * RESPONSIBILITY:
 * - `get<T>(key)`: Retrieve and deserialize a cached value. Returns `null` on miss or Redis-down.
 * - `set<T>(key, value, ttlSeconds)`: Serialize and store a value with TTL expiry.
 * - `delete(key)`: Remove a cached entry.
 * - `exists(key)`: Check if a key exists.
 * - All methods gracefully handle Redis-unavailable scenarios (returns safe defaults).
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/shared/redis/ — globally available via RedisModule.
 *
 * DESIGN DECISIONS:
 * - JSON serialization/deserialization for complex objects.
 * - Silent failure mode: when Redis is down, get() returns null, set() is a no-op.
 *   This ensures local development without Redis works seamlessly.
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
   * Returns null on cache miss or if Redis is unavailable.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected()) {
        return null;
      }

      const raw = await this.redisClient.get(key);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Store a value in cache with a TTL (time-to-live) in seconds.
   * Silently fails if Redis is unavailable.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      if (!this.isConnected()) {
        return;
      }

      const serialized = JSON.stringify(value);
      await this.redisClient.setEx(key, ttlSeconds, serialized);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache SET failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete a cached entry by key.
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected()) {
        return;
      }

      await this.redisClient.del(key);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Cache DELETE failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Check if a key exists in the cache.
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
      this.logger.warn(`Cache EXISTS failed for key "${key}": ${err.message}`);
      return false;
    }
  }

  /**
   * Check if Redis client is connected and ready.
   */
  private isConnected(): boolean {
    return this.redisClient?.isOpen ?? false;
  }
}
