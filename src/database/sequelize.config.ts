import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { AppConfigService } from '@config/app-config.service';

export function createSequelizeOptions(configService: AppConfigService): SequelizeModuleOptions {
  const db = configService.database;
  const connectionOptions = db.url
    ? parseDatabaseUrl(db.url)
    : {
        host: db.host,
        port: db.port,
        username: db.user,
        password: db.password,
        database: db.name,
      };

  return {
    dialect: 'postgres',
    ...connectionOptions,
    autoLoadModels: true,
    synchronize: configService.isDevelopment,
    sync: {
      alter: configService.isDevelopment,
    },
    logging: configService.isDevelopment ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    retryAttempts: 10,
    retryDelay: 3000,
  };
}

function parseDatabaseUrl(databaseUrl: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
} {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  };
}
