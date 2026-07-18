import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [AuditService, MetricsService],
  exports: [AuditService, MetricsService],
})
export class ObservabilityModule {}
