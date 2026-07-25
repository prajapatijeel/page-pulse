/**
 * ============================================================
 * Redis Module
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Global NestJS module providing Redis client connectivity and caching abstraction.
 *
 * RESPONSIBILITY:
 * - Import AppConfigModule for Redis connection parameters.
 * - Register raw Redis client provider (`REDIS_CLIENT`).
 * - Register `CacheService` for application-level caching.
 * - Gracefully disconnect Redis on application shutdown.
 *
 * ARCHITECTURE PLACEMENT:
 * Lives in src/shared/redis/ — marked @Global() so all modules can inject
 * `REDIS_CLIENT` or `CacheService` without importing RedisModule explicitly.
 * ============================================================
 */

import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { AppConfigModule } from '@config/app-config.module';
import { REDIS_CLIENT } from './redis.constants';
import { redisProviders } from './redis.providers';
import { CacheService } from './cache.service';

export interface RedisClientContract {
  isOpen: boolean;
  quit(): Promise<unknown>;
}

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [...redisProviders, CacheService],
  exports: [...redisProviders, REDIS_CLIENT, CacheService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClientContract) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }
}
