import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisClient: {
    isOpen: boolean;
    get: jest.Mock;
    setEx: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
  };

  beforeEach(() => {
    redisClient = {
      isOpen: true,
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    };
    service = new CacheService(redisClient as never);
  });

  it('gets and deserializes cached values', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify({ title: 'Cached page' }));

    await expect(service.get<{ title: string }>('audit:key')).resolves.toEqual({
      title: 'Cached page',
    });
    expect(redisClient.get).toHaveBeenCalledWith('audit:key');
  });

  it('returns null when Redis has no value or is offline', async () => {
    redisClient.get.mockResolvedValue(null);
    await expect(service.get('audit:key')).resolves.toBeNull();

    redisClient.isOpen = false;
    await expect(service.get('audit:key')).resolves.toBeNull();
    expect(redisClient.get).toHaveBeenCalledTimes(1);
  });

  it('stores serialized values with the supplied TTL', async () => {
    redisClient.setEx.mockResolvedValue('OK');

    await service.set('audit:key', { id: 'audit-id' }, 120);

    expect(redisClient.setEx).toHaveBeenCalledWith('audit:key', 120, '{"id":"audit-id"}');
  });

  it('deletes values through delete and its del alias', async () => {
    redisClient.del.mockResolvedValue(1);

    await service.delete('audit:key');
    await service.del('another:key');

    expect(redisClient.del).toHaveBeenNthCalledWith(1, 'audit:key');
    expect(redisClient.del).toHaveBeenNthCalledWith(2, 'another:key');
  });
});
