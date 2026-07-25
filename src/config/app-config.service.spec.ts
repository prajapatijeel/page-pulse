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
            get: jest.fn((key: string, defaultValue: unknown) => {
              if (key === 'appConfig.app.port') return 4000;
              if (key === 'appConfig.app.nodeEnv') return 'production';
              return defaultValue;
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
});
