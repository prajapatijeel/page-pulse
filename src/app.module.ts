import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '@config/app-config.module';
import { AppConfigService } from '@config/app-config.service';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { DatabaseModule } from '@database/database.module';
import { RedisModule } from '@app/shared/redis/redis.module';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { HealthModule } from '@modules/health/health.module';
import { AuditModule } from '@modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        throttlers: [
          {
            ttl: configService.rateLimit.ttl * 1000,
            limit: configService.rateLimit.limit,
          },
        ],
        skipIf: (context) => {
          const request = context
            .switchToHttp()
            .getRequest<{ originalUrl?: string; url?: string }>();
          const path = request.originalUrl || request.url || '';
          return path.startsWith('/api/docs');
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
