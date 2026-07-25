import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  getHealthStatus(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'Page Pulse API',
      timestamp: new Date().toISOString(),
    };
  }
}
