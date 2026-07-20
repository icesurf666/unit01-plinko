import type { SystemStatusResult } from '@plinko/shared';

export function systemReady(status: SystemStatusResult | null, error = ''): boolean {
  return status?.status === 'ready' && !error;
}

export function storeLabel(status: SystemStatusResult): string {
  return status.checks.store.backend === 'postgres-ledger'
    ? 'Postgres ledger'
    : status.checks.store.backend;
}

export function redisLabel(status: SystemStatusResult): string {
  if (!status.checks.redis.configured) return 'Redis optional';
  return status.checks.redis.ok ? 'Redis ready' : 'Redis degraded';
}
