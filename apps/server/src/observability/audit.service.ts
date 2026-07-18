import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics.service';

type AuditFields = Record<string, string | number | boolean | null | undefined>;

@Injectable()
export class AuditService {
  constructor(private readonly metrics: MetricsService) {}

  event(event: string, fields: AuditFields = {}): void {
    this.metrics.inc('plinko_audit_events_total', { event });
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    // One-line JSON logs are easy to ship to Render, Datadog, Loki, or CloudWatch.
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        event,
        ...clean,
      }),
    );
  }
}
