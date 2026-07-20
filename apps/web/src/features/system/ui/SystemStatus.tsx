'use client';

import { useEffect, useState } from 'react';
import type { SystemStatusResult } from '@plinko/shared';
import { getSystemStatus } from '@/shared/lib/api';

const REFRESH_MS = 30_000;

function storeLabel(status: SystemStatusResult): string {
  return status.checks.store.backend === 'postgres-ledger'
    ? 'Postgres ledger'
    : status.checks.store.backend;
}

function redisLabel(status: SystemStatusResult): string {
  if (!status.checks.redis.configured) return 'Redis optional';
  return status.checks.redis.ok ? 'Redis ready' : 'Redis degraded';
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const next = await getSystemStatus();
        if (!cancelled) {
          setStatus(next);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const ready = status?.status === 'ready' && !error;

  return (
    <div className="system-status">
      <div className="system-status-head">
        <span>System Status</span>
        <span className={ready ? 'ok' : 'warn'}>{ready ? 'Ready' : 'Degraded'}</span>
      </div>
      <div className="system-status-grid mono">
        <span>Ledger</span>
        <b>{status ? storeLabel(status) : 'checking...'}</b>
        <span>Cache</span>
        <b>{status ? redisLabel(status) : 'checking...'}</b>
      </div>
      {(error || status?.checks.store.error) && (
        <div className="system-status-error">{error || status?.checks.store.error}</div>
      )}
    </div>
  );
}
