import type { MetricsService } from './metrics.service';
import type { HttpRequestLike, HttpResponseLike, NextFunction } from '../http-types';

export function createMetricsMiddleware(metrics: MetricsService) {
  return (req: HttpRequestLike, res: HttpResponseLike, next: NextFunction): void => {
    const started = Date.now();
    res.on('finish', () => {
      const route = req.route?.path ?? req.path ?? 'unknown';
      const labels = {
        method: req.method,
        route,
        status: res.statusCode,
      };
      metrics.inc('plinko_http_requests_total', labels);
      metrics.observe('plinko_http_request_duration_ms', Date.now() - started, labels);
    });
    next();
  };
}
