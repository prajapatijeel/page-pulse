import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should return health status payload', () => {
    const mockHealth = {
      status: 'ok',
      service: 'Page Pulse API',
      timestamp: '2026-07-25T14:45:00.000Z',
    };
    const spy = jest.spyOn(service, 'getHealthStatus').mockReturnValue(mockHealth);

    const response = controller.getHealth();
    expect(response).toEqual(mockHealth);
    expect(spy).toHaveBeenCalled();
  });
});
