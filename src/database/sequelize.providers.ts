import { Provider } from '@nestjs/common';

export const SEQUELIZE_PROVIDER_TOKEN = 'SEQUELIZE_CONNECTION';

export const sequelizeProviders: Provider[] = [
  {
    provide: SEQUELIZE_PROVIDER_TOKEN,
    useValue: 'SEQUELIZE_CONNECTION_INITIALIZED',
  },
];
