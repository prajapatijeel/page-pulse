export class HealthResponseDto {
  status: string = 'ok';
  service: string = 'Page Pulse API';
  timestamp: string = new Date().toISOString();
}
