import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppConfigModule } from '@config/app-config.module';
import { DatabaseModule } from '@database/database.module';
import { RedisModule } from '@app/shared/redis/redis.module';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { HealthModule } from '@modules/health/health.module';
import { AuditModule } from '@modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, DatabaseModule, RedisModule, HealthModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
