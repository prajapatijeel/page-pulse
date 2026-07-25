import { AppConfigService } from '@config/app-config.service';
import { createSequelizeOptions } from './sequelize.config';

describe('createSequelizeOptions', () => {
  it('should generate production-ready Sequelize options using AppConfigService', () => {
    const mockConfigService = {
      database: {
        host: 'postgres-host',
        port: 5432,
        name: 'page_pulse_db',
        user: 'postgres_user',
        password: 'secret_password',
      },
      isDevelopment: false,
    } as unknown as AppConfigService;

    const options = createSequelizeOptions(mockConfigService);

    expect(options.dialect).toBe('postgres');
    expect(options.host).toBe('postgres-host');
    expect(options.port).toBe(5432);
    expect(options.username).toBe('postgres_user');
    expect(options.password).toBe('secret_password');
    expect(options.database).toBe('page_pulse_db');
    expect(options.autoLoadModels).toBe(true);
    expect(options.synchronize).toBe(false);
    expect(options.logging).toBe(false);
    expect(options.pool).toEqual({
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    });
  });

  it('should enable console logging in development mode', () => {
    const mockConfigService = {
      database: {
        host: 'localhost',
        port: 5432,
        name: 'page_pulse_db',
        user: 'postgres',
        password: 'postgres',
      },
      isDevelopment: true,
    } as unknown as AppConfigService;

    const options = createSequelizeOptions(mockConfigService);
    expect(options.logging).toBe(console.log);
  });
});
