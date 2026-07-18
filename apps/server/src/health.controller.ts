import { Controller, Get } from '@nestjs/common';
import { redisHealth } from './redis';
import { StoreService } from './store/store.service';

@Controller()
export class HealthController {
  constructor(private readonly store: StoreService) {}

  @Get('health')
  health() {
    return { status: 'ok', ts: Date.now() };
  }

  @Get('ready')
  async ready() {
    const checks = {
      store: {
        backend: this.store.backendName,
        ok: await this.store.ready(),
      },
      redis: await redisHealth(),
    };
    const degraded = checks.redis.configured && !checks.redis.ok;
    return {
      status: degraded ? 'degraded' : 'ready',
      checks,
      ts: Date.now(),
    };
  }
}
