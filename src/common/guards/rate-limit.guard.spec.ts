import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { HealthController } from '@modules/health/health.controller';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  const storages: ThrottlerStorageService[] = [];
  const request = {
    requestId: 'rate-limit-request-id',
    ip: '127.0.0.1',
    originalUrl: '/api/v1/audit',
    method: 'POST',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  const response = { header: jest.fn() };
  const context = {
    getHandler: () => function AuditHandler() {},
    getClass: () => class AuditController {},
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };

  afterEach(() => {
    storages.splice(0).forEach((storage) => storage.onApplicationShutdown());
  });

  function createGuard(limit: number, skip = false): RateLimitGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(skip),
    } as unknown as Reflector;
    const storage = new ThrottlerStorageService();
    storages.push(storage);
    const guard = new RateLimitGuard({ throttlers: [{ ttl: 60_000, limit }] }, storage, reflector);
    return guard;
  }

  it('allows requests within the configured limit', async () => {
    const guard = createGuard(2);
    await guard.onModuleInit();

    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
  });

  it('logs and rejects requests exceeding the configured limit', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const guard = createGuard(1);
    await guard.onModuleInit();

    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
    await expect(guard.canActivate(context as unknown as ExecutionContext)).rejects.toThrow(
      HttpException,
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"rate-limit-request-id"'),
    );
    loggerSpy.mockRestore();
  });

  it('excludes the health endpoint through its SkipThrottle decorator', async () => {
    const storage = new ThrottlerStorageService();
    storages.push(storage);
    const guard = new RateLimitGuard(
      { throttlers: [{ ttl: 60_000, limit: 1 }] },
      storage,
      new Reflector(),
    );
    const healthContext = {
      ...context,
      getHandler: () => function GetHealthHandler() {},
      getClass: () => HealthController,
    };
    await guard.onModuleInit();

    await expect(guard.canActivate(healthContext as unknown as ExecutionContext)).resolves.toBe(
      true,
    );
    await expect(guard.canActivate(healthContext as unknown as ExecutionContext)).resolves.toBe(
      true,
    );
  });

  it('excludes Swagger documentation paths', async () => {
    const guard = createGuard(1);
    await guard.onModuleInit();
    request.originalUrl = '/api/docs';
    (
      guard as unknown as { commonOptions: { skipIf: (ctx: ExecutionContext) => boolean } }
    ).commonOptions = {
      skipIf: (ctx) =>
        ctx
          .switchToHttp()
          .getRequest<{ originalUrl?: string }>()
          .originalUrl?.startsWith('/api/docs') ?? false,
    };

    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
    request.originalUrl = '/api/v1/audit';
  });
});
