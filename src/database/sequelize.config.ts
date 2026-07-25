import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { AppConfigService } from '@config/app-config.service';

export function createSequelizeOptions(configService: AppConfigService): SequelizeModuleOptions {
  const db = configService.database;

  return {
    dialect: 'postgres',
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.password,
    database: db.name,
    autoLoadModels: true,
    synchronize: false,
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
