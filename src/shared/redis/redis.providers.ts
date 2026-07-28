/**
 * ============================================================
 * Redis Provider Factory
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Instantiates and configures the Redis client connection provider (`REDIS_CLIENT`).
 *
 * RESPONSIBILITY:
 * - Connect to local Redis server (default host: localhost, port: 6379).
 * - Use `RESP: 2` protocol to support local Windows Redis servers (Redis <6.0)
 *   that do not support the RESP3 `HELLO` command.
 * - Monitor connection events (`ready`, `error`, `reconnecting`).
 * - Log structured status (`Redis Connected`).
 * - Reconnect strategy with exponential backoff.
 * ============================================================
 */

import { Logger, Provider } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '@config/app-config.service';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisProvider');

/**
 * Maximum reconnection retries before pausing reconnection attempts.
 */
const MAX_RETRY_ATTEMPTS = 5;

export const redisProviders: Provider[] = [
  {
    provide: REDIS_CLIENT,
    inject: [AppConfigService],
    useFactory: async (configService: AppConfigService): Promise<RedisClientType> => {
      const { url, host, port } = configService.redis;
      const redisUrl = url ?? `redis://${host}:${port}`;
      const endpoint = new URL(redisUrl).host;
      const client = createClient({
        url: redisUrl,
        RESP: 2 as const, // Use RESP2 protocol to ensure compatibility with Windows & Redis <6.0
        pingInterval: 10000,
        socket: {
          reconnectStrategy: (retries: number): number | Error => {
            if (retries >= MAX_RETRY_ATTEMPTS) {
              logger.error(
                `Redis connection failed after ${MAX_RETRY_ATTEMPTS} attempts. ` +
                  `The application will continue without Redis caching.`,
              );
              return new Error(`Max Redis retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);
            }
            const delay = Math.min(retries * 500, 3000);
            logger.warn(
              `Redis reconnect attempt ${retries + 1}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`,
            );
            return delay;
          },
        },
      });

      client.on('error', (err: Error) => {
        if (!err.message.includes('Max Redis retry attempts')) {
          logger.error(`Redis client error: ${err.message}`);
        }
      });

      client.on('ready', () => {
        logger.log(`Redis Connected`);
      });

      client.on('reconnecting', () => {
        logger.warn(`Redis reconnecting to ${endpoint}...`);
      });

      try {
        await client.connect();
      } catch (err: unknown) {
        const error = err as Error;
        logger.warn(
          `Unable to connect to Redis at ${endpoint}: ${error.message}. ` +
            `Application starting with cache-bypass fallback.`,
        );
      }

      return client as unknown as RedisClientType;
    },
  },
];
