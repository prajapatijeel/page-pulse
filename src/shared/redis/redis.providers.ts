import { Logger, Provider } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '@config/app-config.service';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisProvider');

/**
 * Maximum number of reconnection attempts before giving up.
 * Prevents infinite retry spam when Redis is unavailable (e.g., local dev without Docker).
 */
const MAX_RETRY_ATTEMPTS = 5;

export const redisProviders: Provider[] = [
  {
    provide: REDIS_CLIENT,
    inject: [AppConfigService],
    useFactory: async (configService: AppConfigService): Promise<RedisClientType> => {
      const { host, port } = configService.redis;
      const client: RedisClientType = createClient({
        url: `redis://${host}:${port}`,
        socket: {
          reconnectStrategy: (retries: number): number | Error => {
            if (retries >= MAX_RETRY_ATTEMPTS) {
              logger.error(
                `Redis connection failed after ${MAX_RETRY_ATTEMPTS} attempts. Giving up. ` +
                  `The application will continue without Redis.`,
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

      client.on('connect', () => {
        logger.log(`Redis client connected successfully to ${host}:${port}`);
      });

      try {
        await client.connect();
      } catch {
        logger.warn(
          `Redis is not available at ${host}:${port}. ` +
            `The application will start without Redis. ` +
            `Features depending on Redis will be unavailable.`,
        );
      }

      return client;
    },
  },
];
