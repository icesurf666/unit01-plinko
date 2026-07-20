import { describe, expect, it } from 'vitest';
import type { SystemStatusResult } from '@plinko/shared';
import { redisLabel, storeLabel, systemReady } from './systemStatus';

function status(overrides: Partial<SystemStatusResult> = {}): SystemStatusResult {
  return {
    checks: {
      redis: { configured: false, ok: false },
      store: { backend: 'postgres-ledger', ok: true },
    },
    status: 'ready',
    ts: 1,
    ...overrides,
  };
}

function withChecks(
  checks: SystemStatusResult['checks'],
): Partial<SystemStatusResult> {
  return { checks };
}

describe('system status helpers', () => {
  it('marks only ready responses without fetch errors as ready', () => {
    expect(systemReady(status())).toBe(true);
    expect(systemReady(status({ status: 'degraded' }))).toBe(false);
    expect(systemReady(status(), 'Network failed')).toBe(false);
  });

  it('uses a portfolio-friendly label for the persistent ledger', () => {
    expect(storeLabel(status())).toBe('Postgres ledger');
    expect(
      storeLabel(
        status(
          withChecks({
            redis: { configured: false, ok: false },
            store: { backend: 'memory', ok: true },
          }),
        ),
      ),
    ).toBe('memory');
  });

  it('labels optional and degraded Redis separately', () => {
    expect(redisLabel(status())).toBe('Redis optional');
    expect(
      redisLabel(
        status(
          withChecks({
            redis: { configured: true, ok: true },
            store: { backend: 'postgres-ledger', ok: true },
          }),
        ),
      ),
    ).toBe('Redis ready');
    expect(
      redisLabel(
        status(
          withChecks({
            redis: { configured: true, ok: false },
            store: { backend: 'postgres-ledger', ok: true },
          }),
        ),
      ),
    ).toBe('Redis degraded');
  });
});
