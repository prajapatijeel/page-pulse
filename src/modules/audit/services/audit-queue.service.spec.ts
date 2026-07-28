import { ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '@config/app-config.service';
import { AuditQueueService } from './audit-queue.service';

describe('AuditQueueService', () => {
  let service: AuditQueueService;
  let queue: { size: number; pending: number; add: jest.Mock };

  beforeEach(() => {
    queue = { size: 0, pending: 0, add: jest.fn() };

    service = new AuditQueueService({
      auditQueue: { maxConcurrent: 2, maxQueue: 2 },
    } as AppConfigService);
    Object.assign(service, { queue });
  });

  it('executes work through the mocked p-queue instance', async () => {
    queue.add.mockImplementation((task: () => Promise<string>) => task());

    await expect(
      service.enqueue(() => Promise.resolve('completed'), {
        requestId: 'request-id',
        url: 'https://example.com',
      }),
    ).resolves.toBe('completed');

    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('waits for p-queue to execute the task', async () => {
    let queuedTask: (() => Promise<string>) | undefined;
    let releaseTask: ((value: string) => void) | undefined;
    queue.add.mockImplementation((task: () => Promise<string>) => {
      queuedTask = task;
      return new Promise<string>((resolve) => {
        releaseTask = resolve;
      });
    });

    const pending = service.enqueue(() => Promise.resolve('completed'), {
      requestId: 'request-id',
      url: 'https://example.com',
    });

    expect(queuedTask).toBeDefined();
    expect(await queuedTask?.()).toBe('completed');
    releaseTask?.('completed');
    await expect(pending).resolves.toBe('completed');
  });

  it('releases p-queue capacity after a failed task so another task can run', async () => {
    queue.add
      .mockImplementationOnce((task: () => Promise<unknown>) => task())
      .mockImplementationOnce((task: () => Promise<unknown>) => task());

    await expect(
      service.enqueue(() => Promise.reject(new Error('fetch failed')), {
        requestId: 'request-id',
        url: 'https://failed.example',
      }),
    ).rejects.toThrow('fetch failed');
    await expect(
      service.enqueue(() => Promise.resolve('completed'), {
        requestId: 'request-id',
        url: 'https://next.example',
      }),
    ).resolves.toBe('completed');
    expect(queue.add).toHaveBeenCalledTimes(2);
  });

  it('rejects work when the configured queue capacity is reached', async () => {
    queue.size = 2;

    await expect(
      service.enqueue(() => Promise.resolve('not-run'), {
        requestId: 'request-id',
        url: 'https://example.com',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
