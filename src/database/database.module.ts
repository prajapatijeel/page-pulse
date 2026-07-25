import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppConfigModule } from '@config/app-config.module';
import { AppConfigService } from '@config/app-config.service';
import { createSequelizeOptions } from './sequelize.config';
import { sequelizeProviders } from './sequelize.providers';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: createSequelizeOptions,
    }),
  ],
  providers: [...sequelizeProviders],
  exports: [SequelizeModule, ...sequelizeProviders],
})
export class DatabaseModule {}
