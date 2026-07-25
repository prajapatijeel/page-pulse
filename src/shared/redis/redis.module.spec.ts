import { AppConfigService } from '@config/app-config.service';
import { redisProviders } from './redis.providers';
import { RedisClientContract, RedisModule } from './redis.module';

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
  }),
}));

describe('RedisModule & RedisProviders', () => {
  let mockConfigService: AppConfigService;

  beforeEach(() => {
    mockConfigService = {
      redis: {
        host: 'localhost',
        port: 6379,
      },
    } as unknown as AppConfigService;
  });

  it('should initialize redis client provider using AppConfigService', async () => {
    const provider = redisProviders[0] as {
      useFactory: (config: AppConfigService) => Promise<unknown>;
    };

    const client = await provider.useFactory(mockConfigService);
    expect(client).toBeDefined();
  });

  it('should quit redis client on module destroy', async () => {
    const quitMock = jest.fn().mockResolvedValue(undefined);
    const mockRedisClient: RedisClientContract = {
      isOpen: true,
      quit: quitMock,
    };

    const redisModule = new RedisModule(mockRedisClient);
    await redisModule.onModuleDestroy();

    expect(quitMock).toHaveBeenCalled();
  });
});
