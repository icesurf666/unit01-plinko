import { redisCommand, redisEnabled } from './redis';
import type { MetricsService } from './observability/metrics.service';
import type { HttpRequestLike, HttpResponseLike, NextFunction } from './http-types';
import { integerEnv } from './config/env';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function redisInteger(value: string | number | null): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function createRateLimitMiddleware(metrics?: MetricsService) {
  const windowMs = integerEnv('RATE_LIMIT_WINDOW_MS', { defaultValue: 60_000, min: 1_000 });
  const max = integerEnv('RATE_LIMIT_MAX', { defaultValue: 120, min: 1 });

  return async (req: HttpRequestLike, res: HttpResponseLike, next: NextFunction): Promise<void> => {
    if (req.method === 'OPTIONS' || req.path === '/health') {
      next();
      return;
    }

    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    const ip = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${req.method}:${req.path}`;
    const now = Date.now();
    if (redisEnabled()) {
      const count = redisInteger(await redisCommand(['INCR', `plinko:rate:${key}`]));
      if (count !== null && count > 0) {
        if (count === 1) {
          await redisCommand(['EXPIRE', `plinko:rate:${key}`, Math.ceil(windowMs / 1000)]);
        }
        if (count > max) {
          metrics?.inc('plinko_rate_limit_rejections_total', { backend: 'redis', path: req.path });
          res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
          res.status(429).json({
            statusCode: 429,
            message: 'Too many requests. Please slow down.',
            retryAfter: Math.ceil(windowMs / 1000),
          });
          return;
        }
        next();
        return;
      }
      // Redis is configured but unavailable; continue with the in-process limiter.
    }

    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count <= max) {
      next();
      return;
    }

    metrics?.inc('plinko_rate_limit_rejections_total', { backend: 'memory', path: req.path });
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please slow down.',
      retryAfter,
    });
  };
}
