import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('should return status ok, service name and ISO timestamp', () => {
    const health = service.getHealthStatus();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('Page Pulse API');
    expect(health.timestamp).toBeDefined();
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
  });
});
