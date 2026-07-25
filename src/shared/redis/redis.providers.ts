import { Logger, Provider } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '@config/app-config.service';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisProvider');

export const redisProviders: Provider[] = [
  {
    provide: REDIS_CLIENT,
    inject: [AppConfigService],
    useFactory: async (configService: AppConfigService): Promise<RedisClientType> => {
      const { host, port } = configService.redis;
      const client: RedisClientType = createClient({
        url: `redis://${host}:${port}`,
      });

      client.on('error', (err: Error) => {
        logger.error(`Redis client error: ${err.message}`, err.stack);
      });

      client.on('connect', () => {
        logger.log(`Redis client connected successfully to ${host}:${port}`);
      });

      client.on('reconnecting', () => {
        logger.warn(`Redis client reconnecting to ${host}:${port}...`);
      });

      await client.connect();
      return client;
    },
  },
];
