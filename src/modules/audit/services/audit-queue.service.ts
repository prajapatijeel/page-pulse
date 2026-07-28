/**
 * ============================================================
 * Audit Queue Service
 * ============================================================
 *
 * WHY THIS FILE EXISTS:
 * Singleton wrapper around p-queue that provides in-memory concurrency
 * throttling for URL audit executions. Prevents resource exhaustion by
 * capping active simultaneous web fetches and bounding the waiting queue.
 *
 * RESPONSIBILITIES:
 * - Initialize PQueue with `concurrency` from `AUDIT_MAX_CONCURRENT`.
 * - Enforce queue depth limit from `AUDIT_MAX_QUEUE`.
 * - Throw HTTP 503 (`AUDIT_QUEUE_FULL`) when queue overflows.
 * - Expose queue metrics (`size`, `pending`) for structured logging.
 * - Ensure failed tasks automatically release concurrency slots.
 *
 * ARCHITECTURE PLACEMENT:
 * Singleton provider in AuditModule. Injected into AuditService.
 * Only audit executions use this queue — health, Swagger, and other
 * endpoints are never queued.
 * ============================================================
 */

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '@config/app-config.service';

@Injectable()
export class AuditQueueService implements OnModuleInit {
  private readonly logger = new Logger(AuditQueueService.name);
  private queue!: InstanceType<typeof import('p-queue').default>;

  private maxQueueSize: number;

  constructor(private readonly configService: AppConfigService) {
    this.maxQueueSize = this.configService.auditQueue.maxQueue;
  }

  async onModuleInit(): Promise<void> {
    const { default: PQueue } = await import('p-queue');

    const maxConcurrent = this.configService.auditQueue.maxConcurrent;

    this.queue = new PQueue({ concurrency: maxConcurrent });

    this.logger.log(
      `Audit queue initialized — concurrency: ${maxConcurrent}, maxQueue: ${this.maxQueueSize}`,
    );
  }

  /**
   * Enqueue an audit task for execution.
   *
   * @throws ServiceUnavailableException (HTTP 503) if queue is full.
   */
  async enqueue<T>(taskFn: () => Promise<T>, meta: { requestId: string; url: string }): Promise<T> {
    // Check queue capacity BEFORE adding
    if (this.queue.size >= this.maxQueueSize) {
      this.logger.warn(
        `[${meta.requestId}] Queue Full — url: ${meta.url}, queueLength: ${this.queue.size}, activeWorkers: ${this.queue.pending}`,
      );

      throw new ServiceUnavailableException({
        success: false,
        statusCode: 503,
        message: 'Audit service is currently busy. Please try again later.',
        errorCode: 'AUDIT_QUEUE_FULL',
      });
    }

    this.logger.log(
      `[${meta.requestId}] Audit Queued — url: ${meta.url}, queueLength: ${this.queue.size + 1}, activeWorkers: ${this.queue.pending}`,
    );

    const result = await this.queue.add(async () => {
      this.logger.log(
        `[${meta.requestId}] Audit Started — url: ${meta.url}, queueLength: ${this.queue.size}, activeWorkers: ${this.queue.pending}`,
      );

      return taskFn();
    });

    return result;
  }

  /** Number of tasks waiting in the queue. */
  get size(): number {
    return this.queue.size;
  }

  /** Number of tasks currently executing. */
  get pending(): number {
    return this.queue.pending;
  }
}
