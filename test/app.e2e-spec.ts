import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { REDIS_CLIENT } from '@app/shared/redis/redis.constants';
import { AppModule } from './../src/app.module';

describe('Health Module (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        isOpen: true,
        quit: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-request-id']).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('service', 'Page Pulse API');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('preserves a client supplied X-Request-ID', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-ID', 'client-trace-123')
      .expect(200)
      .expect('X-Request-ID', 'client-trace-123');
  });

  afterEach(async () => {
    await app.close();
  });
});
