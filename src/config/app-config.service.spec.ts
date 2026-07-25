import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'appConfig.app.port') return 4000;
              if (key === 'appConfig.app.nodeEnv') return 'production';
              if (key === 'appConfig.database') {
                return {
                  host: 'localhost',
                  port: 5432,
                  name: 'page_pulse_db',
                  user: 'postgres',
                  password: 'postgres_secret',
                };
              }
              return {};
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should return configured port', () => {
    expect(service.port).toBe(4000);
  });

  it('should return configured nodeEnv and environment helpers', () => {
    expect(service.nodeEnv).toBe('production');
    expect(service.isProduction).toBe(true);
    expect(service.isDevelopment).toBe(false);
  });

  it('should return database config strictly from ConfigService', () => {
    expect(service.database.password).toBe('postgres_secret');
  });
});
