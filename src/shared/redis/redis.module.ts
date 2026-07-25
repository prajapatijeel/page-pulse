import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { AppConfigModule } from '@config/app-config.module';
import { REDIS_CLIENT } from './redis.constants';
import { redisProviders } from './redis.providers';

export interface RedisClientContract {
  isOpen: boolean;
  quit(): Promise<unknown>;
}

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [...redisProviders],
  exports: [...redisProviders, REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClientContract) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }
}
