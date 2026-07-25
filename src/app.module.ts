import { Module } from '@nestjs/common';
import { AppConfigModule } from '@config/app-config.module';
import { HealthModule } from '@modules/health/health.module';
import { AuditModule } from '@modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, HealthModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
