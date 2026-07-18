import 'reflect-metadata';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOrigin, allowedOrigins } from './cors';
import { createRateLimitMiddleware } from './rate-limit';
import { createRequestIdMiddleware } from './request-id';
import { createSecurityHeadersMiddleware } from './security-headers';
import { createMetricsMiddleware } from './observability/metrics.middleware';
import { MetricsService } from './observability/metrics.service';
import { HttpErrorFilter } from './http-exception.filter';
import { integerEnv } from './config/env';
import { validateRuntimeConfig } from './config/validate';

// Node 22: load .env from cwd (apps/server) before providers are instantiated.
try {
  loadEnvFile();
} catch {
  /* .env is optional (e.g. in prod the vars come from the environment) */
}

async function bootstrap() {
  validateRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  const metrics = app.get(MetricsService);
  app.use(createRequestIdMiddleware());
  app.use(createSecurityHeadersMiddleware());
  app.use(createMetricsMiddleware(metrics));
  app.use(createRateLimitMiddleware(metrics));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
  });
  const port = integerEnv('PORT', { defaultValue: 3001, min: 1, max: 65_535 });
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`UNIT-01 Plinko server -> http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`CORS origins -> ${allowedOrigins().join(', ')}`);
}
void bootstrap();
