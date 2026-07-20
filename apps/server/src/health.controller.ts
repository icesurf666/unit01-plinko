import { Controller, Get } from '@nestjs/common';
import type { SystemStatusResult } from '@plinko/shared';
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
  async ready(): Promise<SystemStatusResult> {
    const store = await this.storeCheck();
    const checks = {
      store,
      redis: await redisHealth(),
    };
    const degraded = !checks.store.ok || (checks.redis.configured && !checks.redis.ok);
    return {
      status: degraded ? 'degraded' : 'ready',
      checks,
      ts: Date.now(),
    };
  }

  private async storeCheck(): Promise<SystemStatusResult['checks']['store']> {
    try {
      return {
        backend: this.store.backendName,
        ok: await this.store.ready(),
      };
    } catch (error) {
      return {
        backend: this.store.backendName,
        ok: false,
        error: error instanceof Error ? error.message : 'Store readiness check failed.',
      };
    }
  }
}
